import { FEED_CATEGORY_RULES } from './constants.js';
import { normalizeSkillList } from './data-normalizers.js';

export function groupFeedProfilesByCategory(profiles = []) {
  const groupsMap = new Map();
  const fallbackRule = FEED_CATEGORY_RULES.find((rule) => rule.key === 'otros') || {
    key: 'otros',
    title: 'Otras habilidades',
    subtitle: 'Perfiles con intereses diversos',
    keywords: [],
  };

  FEED_CATEGORY_RULES.forEach((rule) => {
    if (rule.key === fallbackRule.key) return;
    groupsMap.set(rule.key, {
      ...rule,
      profiles: [],
    });
  });

  const fallbackGroup = {
    ...fallbackRule,
    profiles: [],
  };

  profiles.forEach((profile) => {
    const categoryKey = resolveFeedCategoryKey(profile);
    if (categoryKey === fallbackGroup.key) {
      fallbackGroup.profiles.push(profile);
      return;
    }

    const group = groupsMap.get(categoryKey);
    if (group) {
      group.profiles.push(profile);
      return;
    }

    fallbackGroup.profiles.push(profile);
  });

  return [...groupsMap.values(), fallbackGroup].filter(
    (group) => group.profiles.length > 0
  );
}

export function resolveFeedCategoryKey(profile = {}) {
  const normalizedHints = collectProfileCategoryHints(profile)
    .map((hint) => normalizeFeedCategoryText(hint))
    .filter(Boolean);

  if (normalizedHints.length === 0) {
    return 'otros';
  }

  const directCategoryHint = normalizeFeedCategoryText(
    profile?.category || profile?.interest || ''
  );

  const candidateScores = [];

  for (const rule of FEED_CATEGORY_RULES) {
    if (rule.key === 'otros') continue;

    const score = computeCategoryScore(rule, normalizedHints, directCategoryHint);
    if (score > 0) {
      candidateScores.push({ key: rule.key, score });
    }
  }

  if (candidateScores.length === 0) {
    return 'otros';
  }

  candidateScores.sort((a, b) => b.score - a.score);
  return candidateScores[0].key;
}

export function computeCategoryScore(rule, normalizedHints, directCategoryHint) {
  const normalizedKeywords = (rule.keywords || [])
    .map((keyword) => normalizeFeedCategoryText(keyword))
    .filter(Boolean);

  if (normalizedKeywords.length === 0) return 0;

  let score = 0;

  normalizedHints.forEach((hint) => {
    normalizedKeywords.forEach((keyword) => {
      if (hint === keyword) {
        score += 4;
      } else if (hint.includes(keyword)) {
        score += 2;
      }
    });
  });

  if (directCategoryHint) {
    if (directCategoryHint === normalizeFeedCategoryText(rule.key)) {
      score += 8;
    }

    if (directCategoryHint.includes(normalizeFeedCategoryText(rule.title))) {
      score += 5;
    }

    normalizedKeywords.forEach((keyword) => {
      if (directCategoryHint.includes(keyword)) {
        score += 3;
      }
    });
  }

  return score;
}

export function collectProfileCategoryHints(profile = {}) {
  const teachSkills = normalizeSkillList(
    profile?.skills_to_teach || profile?.teach_skills,
    { limit: 30 }
  );
  const learnSkills = normalizeSkillList(
    profile?.skills_to_learn || profile?.learn_skills,
    { limit: 30 }
  );

  const extraHints = [
    profile?.interest,
    profile?.category,
    profile?.primary_skill,
    profile?.headline,
    profile?.bio,
  ]
    .map((value) => String(value || '').trim())
    .filter(Boolean);

  return [...teachSkills, ...learnSkills, ...extraHints];
}

export function normalizeFeedCategoryText(value = '') {
  return String(value)
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9#+./\s-]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}
