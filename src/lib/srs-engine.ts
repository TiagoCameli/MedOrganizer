/**
 * SRS Engine — SM-2 Anki-style Spaced Repetition Algorithm
 *
 * Pure functions with no side effects.
 * Receives card data + rating, returns updated card data.
 */

import type { Flashcard, StudyQuality, CardStatus } from '@/types'

// ============================================================
// Configuration
// ============================================================

export const SRS_CONFIG = {
  learningSteps: [1, 10],        // minutes
  relearningSteps: [10],          // minutes
  graduatingInterval: 1,          // days
  easyInterval: 4,                // days
  startingEase: 2.5,
  minimumEase: 1.3,
  fuzzPercentage: 0.05,           // ±5%
  newCardsPerDay: 20,
  maxReviewsPerDay: 200,
} as const

// ============================================================
// Types
// ============================================================

export interface SRSResult {
  status: CardStatus
  ease_factor: number
  interval_days: number
  repetitions: number
  next_review: string
  lapses: number
  learning_step: number
}

export interface IntervalPreviews {
  again: string
  hard: string
  good: string
  easy: string
}

// ============================================================
// Fuzz — spread reviews to avoid clustering
// ============================================================

export function applyFuzz(intervalDays: number): number {
  if (intervalDays < 3) return intervalDays
  const fuzz = intervalDays * SRS_CONFIG.fuzzPercentage
  const min = intervalDays - fuzz
  const max = intervalDays + fuzz
  return Math.round(min + Math.random() * (max - min))
}

// ============================================================
// Format interval for display
// ============================================================

export function formatInterval(minutes: number): string {
  if (minutes < 60) return `${Math.round(minutes)}min`
  if (minutes < 60 * 24) return `${Math.round(minutes / 60)}h`
  const days = minutes / (60 * 24)
  if (days < 31) return `${Math.round(days)}d`
  if (days < 365) return `${(days / 30).toFixed(1)}m`
  return `${(days / 365).toFixed(1)}a`
}

// ============================================================
// Core Algorithm — processAnswer
// ============================================================

export function processAnswer(card: Flashcard, rating: StudyQuality): SRSResult {
  const now = new Date()
  let {
    status, ease_factor, interval_days, repetitions,
    lapses, learning_step,
  } = card

  // Ensure minimum ease
  if (ease_factor < SRS_CONFIG.minimumEase) {
    ease_factor = SRS_CONFIG.minimumEase
  }

  // ---- NEW / LEARNING ----
  if (status === 'new' || status === 'learning') {
    const steps = SRS_CONFIG.learningSteps

    if (status === 'new') {
      status = 'learning'
      learning_step = 0
    }

    switch (rating) {
      case 1: // Errei — reset to first step
        learning_step = 0
        return makeResult({
          status: 'learning', ease_factor, interval_days, repetitions,
          lapses, learning_step,
          nextDate: addMinutes(now, steps[0]),
        })

      case 2: // Difícil — repeat current step with 1.5x time
        return makeResult({
          status: 'learning', ease_factor, interval_days, repetitions,
          lapses, learning_step,
          nextDate: addMinutes(now, Math.round(steps[learning_step] * 1.5)),
        })

      case 3: // Bom — advance to next step
        learning_step++
        if (learning_step >= steps.length) {
          // Graduate to review
          const gradInterval = SRS_CONFIG.graduatingInterval
          return makeResult({
            status: 'review', ease_factor,
            interval_days: gradInterval,
            repetitions: 1, lapses, learning_step,
            nextDate: addDays(now, gradInterval),
          })
        }
        return makeResult({
          status: 'learning', ease_factor, interval_days, repetitions,
          lapses, learning_step,
          nextDate: addMinutes(now, steps[learning_step]),
        })

      case 4: // Fácil — skip straight to review with easy interval
        return makeResult({
          status: 'review', ease_factor: ease_factor + 0.15,
          interval_days: SRS_CONFIG.easyInterval,
          repetitions: 1, lapses, learning_step,
          nextDate: addDays(now, SRS_CONFIG.easyInterval),
        })
    }
  }

  // ---- REVIEW ----
  if (status === 'review') {
    switch (rating) {
      case 1: { // Errei — lapse, go to relearning
        ease_factor = Math.max(SRS_CONFIG.minimumEase, ease_factor - 0.20)
        lapses++
        return makeResult({
          status: 'relearning', ease_factor,
          interval_days, // keep old interval for recovery calculation
          repetitions: 0, lapses, learning_step: 0,
          nextDate: addMinutes(now, SRS_CONFIG.relearningSteps[0]),
        })
      }

      case 2: { // Difícil
        ease_factor = Math.max(SRS_CONFIG.minimumEase, ease_factor - 0.15)
        const newInterval = applyFuzz(Math.max(1, Math.round(interval_days * 1.2)))
        repetitions++
        return makeResult({
          status: 'review', ease_factor,
          interval_days: newInterval,
          repetitions, lapses, learning_step,
          nextDate: addDays(now, newInterval),
        })
      }

      case 3: { // Bom
        const newInterval = applyFuzz(Math.max(1, Math.round(interval_days * ease_factor)))
        repetitions++
        return makeResult({
          status: 'review', ease_factor,
          interval_days: newInterval,
          repetitions, lapses, learning_step,
          nextDate: addDays(now, newInterval),
        })
      }

      case 4: { // Fácil
        ease_factor += 0.15
        const newInterval = applyFuzz(Math.max(1, Math.round(interval_days * ease_factor * 1.3)))
        repetitions++
        return makeResult({
          status: 'review', ease_factor,
          interval_days: newInterval,
          repetitions, lapses, learning_step,
          nextDate: addDays(now, newInterval),
        })
      }
    }
  }

  // ---- RELEARNING ----
  if (status === 'relearning') {
    const steps = SRS_CONFIG.relearningSteps

    switch (rating) {
      case 1: // Errei — reset to first relearning step
        learning_step = 0
        return makeResult({
          status: 'relearning', ease_factor, interval_days, repetitions,
          lapses, learning_step,
          nextDate: addMinutes(now, steps[0]),
        })

      case 2: // Difícil — repeat current step with 1.5x
        return makeResult({
          status: 'relearning', ease_factor, interval_days, repetitions,
          lapses, learning_step,
          nextDate: addMinutes(now, Math.round(steps[learning_step] * 1.5)),
        })

      case 3: { // Bom — advance step or graduate back to review
        learning_step++
        if (learning_step >= steps.length) {
          // Graduate back to review with reduced interval
          const recoveryInterval = Math.max(1, Math.round(interval_days * 0.5))
          return makeResult({
            status: 'review', ease_factor,
            interval_days: recoveryInterval,
            repetitions: 1, lapses, learning_step,
            nextDate: addDays(now, recoveryInterval),
          })
        }
        return makeResult({
          status: 'relearning', ease_factor, interval_days, repetitions,
          lapses, learning_step,
          nextDate: addMinutes(now, steps[learning_step]),
        })
      }

      case 4: { // Fácil — graduate immediately with better interval
        const recoveryInterval = Math.max(1, Math.round(interval_days * 0.5))
        return makeResult({
          status: 'review', ease_factor: ease_factor + 0.15,
          interval_days: recoveryInterval,
          repetitions: 1, lapses, learning_step,
          nextDate: addDays(now, recoveryInterval),
        })
      }
    }
  }

  // Fallback (should not reach)
  return makeResult({
    status, ease_factor, interval_days, repetitions,
    lapses, learning_step,
    nextDate: addDays(now, 1),
  })
}

// ============================================================
// Preview — getNextIntervals
// ============================================================

export function getNextIntervals(card: Flashcard): IntervalPreviews {
  // We need deterministic previews, so temporarily override fuzz
  const results = {
    again: getIntervalMinutes(card, 1),
    hard: getIntervalMinutes(card, 2),
    good: getIntervalMinutes(card, 3),
    easy: getIntervalMinutes(card, 4),
  }

  return {
    again: formatInterval(results.again),
    hard: formatInterval(results.hard),
    good: formatInterval(results.good),
    easy: formatInterval(results.easy),
  }
}

function getIntervalMinutes(card: Flashcard, rating: StudyQuality): number {
  const status = card.status === 'new' ? 'learning' : card.status
  const steps = (status === 'relearning') ? SRS_CONFIG.relearningSteps : SRS_CONFIG.learningSteps
  const learningStep = card.learning_step

  if (status === 'learning' || status === 'relearning') {
    switch (rating) {
      case 1: return steps[0]
      case 2: return Math.round(steps[learningStep] * 1.5)
      case 3: {
        const nextStep = learningStep + 1
        if (nextStep >= steps.length) {
          if (status === 'relearning') {
            return Math.max(1, Math.round(card.interval_days * 0.5)) * 60 * 24
          }
          return SRS_CONFIG.graduatingInterval * 60 * 24
        }
        return steps[nextStep]
      }
      case 4: {
        if (status === 'relearning') {
          return Math.max(1, Math.round(card.interval_days * 0.5)) * 60 * 24
        }
        return SRS_CONFIG.easyInterval * 60 * 24
      }
    }
  }

  // Review status
  const ef = Math.max(SRS_CONFIG.minimumEase, card.ease_factor)
  const interval = card.interval_days || 1
  switch (rating) {
    case 1: return SRS_CONFIG.relearningSteps[0]
    case 2: return Math.max(1, Math.round(interval * 1.2)) * 60 * 24
    case 3: return Math.max(1, Math.round(interval * ef)) * 60 * 24
    case 4: return Math.max(1, Math.round(interval * (ef + 0.15) * 1.3)) * 60 * 24
  }
}

// ============================================================
// Helpers
// ============================================================

function makeResult(params: {
  status: CardStatus
  ease_factor: number
  interval_days: number
  repetitions: number
  lapses: number
  learning_step: number
  nextDate: Date
}): SRSResult {
  return {
    status: params.status,
    ease_factor: Math.round(Math.max(SRS_CONFIG.minimumEase, params.ease_factor) * 100) / 100,
    interval_days: params.interval_days,
    repetitions: params.repetitions,
    lapses: params.lapses,
    learning_step: params.learning_step,
    next_review: params.nextDate.toISOString().split('T')[0],
  }
}

function addMinutes(date: Date, minutes: number): Date {
  // For sub-day intervals, we still set next_review to today's date
  // so the card appears in the current session's queue
  return new Date(date)
}

function addDays(date: Date, days: number): Date {
  const d = new Date(date)
  d.setDate(d.getDate() + days)
  return d
}
