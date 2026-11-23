import { GUIDE_DEEP_PART1, type GuideDeepEntry } from './guideDeepContentPart1';
import { GUIDE_DEEP_PART2 } from './guideDeepContentPart2';

export type { GuideDeepEntry };

export const GUIDE_DEEP_CONTENT: Record<string, GuideDeepEntry> = {
  ...GUIDE_DEEP_PART1,
  ...GUIDE_DEEP_PART2,
};
