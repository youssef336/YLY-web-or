/**
 * Direct per-member category scores. In the SMMEMBER template these map
 * 1:1 to the AK (Interaction /10), AL (Respect Hierarchy /10) and
 * AM (Bonus /10) columns.
 */
export interface CategoryScores {
  memberId: string;
  /** 0..10 */
  interaction: number;
  /** 0..10 */
  respectHierarchy: number;
  /** 0..10 */
  bonus: number;
  updatedAt: Date;
}