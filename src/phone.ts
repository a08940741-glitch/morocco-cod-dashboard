import { AppError } from "./errors.js";

export function normalizeMoroccanPhone(input: string): string {
  const compact = input.trim().replace(/[\s().-]/g, "");
  let national: string;

  if (/^\+212[5-7]\d{8}$/.test(compact)) {
    return compact;
  }
  if (/^00212[5-7]\d{8}$/.test(compact)) {
    return `+${compact.slice(2)}`;
  }
  if (/^0[5-7]\d{8}$/.test(compact)) {
    national = compact.slice(1);
  } else {
    throw new AppError("Enter a valid Moroccan phone number.", 400, "INVALID_PHONE");
  }

  return `+212${national}`;
}
