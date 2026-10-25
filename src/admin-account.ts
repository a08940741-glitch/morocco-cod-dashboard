import { randomBytes, scryptSync, timingSafeEqual } from "node:crypto";
import { mkdirSync, readFileSync, renameSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { z } from "zod";

const accountSchema = z.object({
  username: z.string().min(3).max(100),
  fullName: z.string().max(100).default(""),
  email: z.string().max(254).default(""),
  phone: z.string().max(20).default(""),
  storeName: z.string().max(100).default(""),
  salt: z.string().regex(/^[a-f0-9]{64}$/),
  passwordHash: z.string().regex(/^[a-f0-9]{64}$/),
});
const accountsFileSchema = z.object({
  version: z.literal(2),
  accounts: z.array(accountSchema),
});
const legacyAccountFileSchema = accountSchema.extend({ version: z.literal(1) });

type AdminAccount = z.infer<typeof accountSchema>;

export class AdminAccountStore {
  private readonly filePath: string;
  private accounts: AdminAccount[] = [];

  constructor(filePath: string) {
    this.filePath = resolve(filePath);
    try {
      const parsed: unknown = JSON.parse(readFileSync(this.filePath, "utf8"));
      const current = accountsFileSchema.safeParse(parsed);
      if (current.success) {
        this.accounts = current.data.accounts;
        return;
      }

      const legacy = legacyAccountFileSchema.parse(parsed);
      const { version: _version, ...account } = legacy;
      this.accounts = [account];
      this.save();
    } catch (error) {
      if (isMissingFile(error)) return;
      throw new Error(`Unable to load admin account file "${this.filePath}".`, { cause: error });
    }
  }

  get isConfigured(): boolean {
    return this.accounts.length > 0;
  }

  isTaken(username: string, email: string): boolean {
    return this.accounts.some((account) =>
      account.username.toLocaleLowerCase() === username.toLocaleLowerCase()
      || account.email.toLocaleLowerCase() === email.toLocaleLowerCase()
    );
  }

  create(profile: Pick<AdminAccount, "username" | "fullName" | "email" | "phone" | "storeName">, password: string): boolean {
    if (this.isTaken(profile.username, profile.email)) return false;

    const salt = randomBytes(32).toString("hex");
    const account: AdminAccount = {
      ...profile,
      salt,
      passwordHash: scryptSync(password, salt, 32).toString("hex"),
    };
    this.accounts.push(account);
    try {
      this.save();
    } catch (error) {
      this.accounts.pop();
      throw error;
    }
    return true;
  }

  verify(username: string, password: string): boolean {
    const account = this.accounts.find((candidate) => candidate.username.toLocaleLowerCase() === username.toLocaleLowerCase());
    if (!account) return false;
    const supplied = scryptSync(password, account.salt, 32);
    const expected = Buffer.from(account.passwordHash, "hex");
    return timingSafeEqual(supplied, expected);
  }

  private save(): void {
    const directory = dirname(this.filePath);
    const temporaryPath = `${this.filePath}.${process.pid}.tmp`;
    mkdirSync(directory, { recursive: true });
    writeFileSync(
      temporaryPath,
      `${JSON.stringify({ version: 2, accounts: this.accounts }, null, 2)}\n`,
      { encoding: "utf8", mode: 0o600 },
    );
    renameSync(temporaryPath, this.filePath);
  }
}

function isMissingFile(error: unknown): boolean {
  return typeof error === "object" && error !== null && "code" in error && error.code === "ENOENT";
}
