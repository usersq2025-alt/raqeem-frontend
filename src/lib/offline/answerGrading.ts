/**
 * Client-side grading mirrors (byte-for-byte, verified against) the 6 PHP graders in
 * raqeem-api's app/Services/Grading/*AnswerGrader.php, so an offline-solved question
 * shows the same correct/wrong feedback the server would give - the server remains the
 * real authority (src/lib/offline/lessonOffline.ts replays every answer through the
 * real submitAnswer on sync), this is only for instant local feedback while offline.
 *
 * None of the 6 graders do Arabic normalization (no diacritic stripping, no alef/ya
 * unification) - only `trim()`, and only for crossword. Everything else is exact
 * string/bool comparison. Do not "improve" this with extra normalization or it will
 * disagree with the server in the other direction.
 */

type AnswerKey = Record<string, unknown>;

interface RightItem {
  id: string | number;
  text?: string;
  image_url?: string | null;
}

// Backend: labels[right_id] = 'img:'+right_id if right_image is set, else trim(right_text).
// Two text-only right items with identical trimmed text are interchangeable; an image
// right item is only ever equal to itself.
function rightItemLabel(item: RightItem): string {
  return item.image_url ? `img:${item.id}` : (item.text ?? "").trim();
}

function matchingPairsCorrect(payload: unknown, answerKey: AnswerKey, selected: unknown): boolean {
  const correctMatches = (answerKey.correct_matches ?? {}) as Record<string, string>;
  const leftIds = Object.keys(correctMatches);
  const rightItems = ((payload as { right_items?: RightItem[] } | null)?.right_items ?? []) as RightItem[];
  const labels = new Map(rightItems.map((item) => [String(item.id), rightItemLabel(item)]));
  const matches = ((selected as { matches?: Record<string, unknown> } | null)?.matches ?? {}) as Record<string, unknown>;

  if (leftIds.length === 0 || Object.keys(matches).length !== leftIds.length) return false;

  const usedRightIds = new Set<string>();
  for (const leftId of leftIds) {
    if (!(leftId in matches)) return false;
    const answerRightId = String(matches[leftId]);
    if (usedRightIds.has(answerRightId)) return false; // كل right_id يُستخدم مرة واحدة فقط
    usedRightIds.add(answerRightId);
    const correctRightId = String(correctMatches[leftId]);
    if (labels.get(answerRightId) !== labels.get(correctRightId)) return false;
  }
  return true;
}

export function isAnswerCorrect(gameType: string, payload: unknown, answerKey: AnswerKey, selected: unknown): boolean {
  const s = selected as Record<string, unknown> | null | undefined;

  switch (gameType) {
    case "mcq": {
      const correct = answerKey.correct_option_id;
      return correct != null && s?.selected_option_id != null && String(correct) === String(s.selected_option_id);
    }

    case "true_false": {
      if (typeof s?.answer !== "boolean") return false;
      return answerKey.correct_answer === s.answer;
    }

    case "matching_pairs":
      return matchingPairsCorrect(payload, answerKey, selected);

    case "drag_classify": {
      const correctAssignments = (answerKey.correct_assignments ?? {}) as Record<string, string>;
      const assignments = (s?.assignments ?? {}) as Record<string, unknown>;
      const entries = Object.entries(correctAssignments);
      if (entries.length === 0) return false;
      return entries.every(([itemId, categoryId]) => String(assignments[itemId]) === String(categoryId));
    }

    case "crossword": {
      const correctAnswers = (answerKey.correct_answers ?? {}) as Record<string, string>;
      const answers = (s?.answers ?? {}) as Record<string, unknown>;
      const entries = Object.entries(correctAnswers);
      if (entries.length === 0) return false;
      return entries.every(([wordId, answer]) => String(answers[wordId] ?? "").trim() === String(answer).trim());
    }

    case "ordering": {
      const correctOrder = (answerKey.correct_order ?? []) as unknown[];
      const order = (s?.order ?? []) as unknown[];
      if (correctOrder.length === 0 || order.length !== correctOrder.length) return false;
      return correctOrder.every((id, index) => String(order[index]) === String(id));
    }

    default:
      return false;
  }
}
