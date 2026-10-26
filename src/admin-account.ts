import { randomBytes, scryptSync, timingSafeEqual } from "node:crypto";
import { mkdirSync, readFileSync, renameSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { z } from "zod";

const accountDataSchema = z.object({
  username: z.string().min(3).max(100),
  fullName: z.string().max(100).default(""),
  email: z.string().max(254).default(""),
  phone: z.string().max(20).default(""),
  storeName: z.string().max(100).default(""),
  salt: z.string().regex(/^[a-f0-9]{64}$/),
  passwordHash: z.string().regex(/^[a-f0-9]{64}$/),
});
const accountSchema = accountDataSchema.extend({ role: z.enum(["owner", "admin"]) });
const accountsFileSchema = z.object({
  version: z.literal(3),
  accounts: z.array(accountSchema),
});
const previousAccountsFileSchema = z.object({
  version: z.literal(2),
  accounts: z.array(accountDataSchema),
});
const legacyAccountFileSchema = accountDataSchema.extend({ version: z.literal(1) });

type AdminAccount = z.infer<typeof accountSchema>;
export type AdminAccountRole = AdminAccount["role"];

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

      const previous = previousAccountsFileSchema.safeParse(parsed);
      if (previous.success) {
        this.accounts = previous.data.accounts.map((account, index) => ({
          ...account,
          role: index === 0 ? "owner" : "admin",
        }));
        this.save();
        return;
      }

      const legacy = legacyAccountFileSchema.parse(parsed);
      const { version: _version, ...account } = legacy;
      this.accounts = [{ ...account, role: "owner" }];
      this.save();
    } catch (error) {
      if (isMissingFile(error)) return;
      throw new Error(`Unable to load admin account file "${this.filePath}".`, { cause: error });
    }
  }

  get isConfigured(): boolean {
    return this.accounts.length > 0;
  }

  get firstAccountUsername(): string | undefined {
    return this.accounts[0]?.username;
  }

  getRole(username: string): AdminAccountRole | undefined {
    return this.findAccount(username)?.role;
  }

  getUsername(username: string): string | undefined {
    return this.findAccount(username)?.username;
  }

  listStores(): Array<{ username: string; storeName: string }> {
    return this.accounts.map(({ username, storeName }) => ({ username, storeName }));
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
      role: this.accounts.length === 0 ? "owner" : "admin",
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
    const account = this.findAccount(username);
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
      `${JSON.stringify({ version: 3, accounts: this.accounts }, null, 2)}\n`,
      { encoding: "utf8", mode: 0o600 },
    );
    renameSync(temporaryPath, this.filePath);
  }

  private findAccount(username: string): AdminAccount | undefined {
    const normalizedUsername = username.toLocaleLowerCase();
    return this.accounts.find((candidate) => candidate.username.toLocaleLowerCase() === normalizedUsername);
  }
}

function isMissingFile(error: unknown): boolean {
  return typeof error === "object" && error !== null && "code" in error && error.code === "ENOENT";
}
