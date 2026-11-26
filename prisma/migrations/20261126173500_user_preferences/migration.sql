CREATE TYPE "PreferenceCurrency" AS ENUM ('BRL', 'USD', 'EUR');
CREATE TYPE "PreferenceTheme" AS ENUM ('LIGHT', 'DARK', 'SYSTEM');

CREATE TABLE "UserPreferences" (
    "userId" TEXT NOT NULL,
    "currency" "PreferenceCurrency" NOT NULL DEFAULT 'BRL',
    "theme" "PreferenceTheme" NOT NULL DEFAULT 'LIGHT',
    "billReminders" BOOLEAN NOT NULL DEFAULT true,
    "monthlySummary" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "UserPreferences_pkey" PRIMARY KEY ("userId"),
    CONSTRAINT "UserPreferences_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE
);

INSERT INTO "UserPreferences" ("userId", "updatedAt")
SELECT "id", CURRENT_TIMESTAMP FROM "User"
ON CONFLICT ("userId") DO NOTHING;
