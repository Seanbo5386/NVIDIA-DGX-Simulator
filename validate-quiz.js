const data = require('./src/data/quizQuestions.json');

console.log('=== Quiz Questions Validation ===\n');
console.log('Total questions:', data.questions.length);

// Count per family
const familyDiff = {};
data.questions.forEach(q => {
  if (!familyDiff[q.familyId]) familyDiff[q.familyId] = { beginner: 0, intermediate: 0, advanced: 0 };
  familyDiff[q.familyId][q.difficulty]++;
});

console.log('\nDifficulty distribution per family:');
Object.entries(familyDiff).forEach(([family, diffs]) => {
  console.log(`  ${family}: beginner=${diffs.beginner}, intermediate=${diffs.intermediate}, advanced=${diffs.advanced}`);
});

// Validate structure
let valid = true;
data.questions.forEach(q => {
  if (!q.id || !q.familyId || !q.scenario || !q.choices || !q.correctAnswer || !q.explanation || !q.whyNotOthers || !q.difficulty) {
    console.log(`ERROR: Question ${q.id} missing required field`);
    valid = false;
  }
  if (!q.choices.includes(q.correctAnswer)) {
    console.log(`ERROR: Question ${q.id} correctAnswer not in choices`);
    valid = false;
  }
  if (q.whyNotOthers.length !== q.choices.length - 1) {
    console.log(`WARNING: Question ${q.id} has ${q.whyNotOthers.length} whyNotOthers but ${q.choices.length - 1} expected`);
  }
});

console.log('\nStructure validation:', valid ? 'PASSED' : 'FAILED');
