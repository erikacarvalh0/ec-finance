CREATE TYPE "CategoryType" AS ENUM ('EXPENSE', 'INCOME');
ALTER TABLE "User" ADD COLUMN "categoriesInitializedAt" TIMESTAMP(3);
ALTER TABLE "Category"
    ADD COLUMN "type" "CategoryType" NOT NULL DEFAULT 'EXPENSE',
    ADD COLUMN "color" TEXT NOT NULL DEFAULT '#929BAA',
    ADD COLUMN "iconBackground" TEXT NOT NULL DEFAULT '#EDF0F5',
    ADD COLUMN "icon" TEXT NOT NULL DEFAULT 'ellipsis',
    ADD COLUMN "sortOrder" INTEGER NOT NULL DEFAULT 1000;
DROP INDEX "Category_userId_name_key";
CREATE UNIQUE INDEX "Category_userId_type_name_key" ON "Category"("userId", "type", "name");
ALTER TABLE "Income" ADD COLUMN "categoryId" TEXT;
ALTER TABLE "Income" ADD CONSTRAINT "Income_categoryId_userId_fkey"
    FOREIGN KEY ("categoryId", "userId") REFERENCES "Category"("id", "userId") ON DELETE RESTRICT ON UPDATE CASCADE;

-- Claim initialization once, in the same transaction as the inserts.
CREATE FUNCTION initialize_finance_categories(owner_id TEXT) RETURNS void LANGUAGE plpgsql AS $$
BEGIN
    UPDATE "User" SET "categoriesInitializedAt" = CURRENT_TIMESTAMP
    WHERE "id" = owner_id AND "categoriesInitializedAt" IS NULL;
    IF NOT FOUND THEN RETURN; END IF;
    INSERT INTO "Category" ("id", "userId", "type", "name", "icon", "color", "iconBackground", "sortOrder")
    SELECT 'default_' || md5(owner_id || ':' || d.kind || ':' || d.name), owner_id,
           d.kind::"CategoryType", d.name, d.icon, d.color, d.background, d.position
    FROM (VALUES
        ('EXPENSE','Alimentação','shopping-cart','#16C6A2','#D4F7EE', 0),
        ('EXPENSE','Moradia','house','#12BCE5','#DDF5FC', 1),
        ('EXPENSE','Transporte','car-front','#9B68E8','#EEE2FC', 2),
        ('EXPENSE','Saúde','heart','#F45AA7','#FFE1EE', 3),
        ('EXPENSE','Outros','ellipsis','#929BAA','#EDF0F5', 4),
        ('INCOME','Salário','wallet','#16C6A2','#D4F7EE', 0),
        ('INCOME','Freelance','briefcase','#12BCE5','#DDF5FC', 1),
        ('INCOME','Rendimentos','trending-up','#9B68E8','#EEE2FC', 2),
        ('INCOME','Reembolsos','arrow-left-right','#F45AA7','#FFE1EE', 3),
        ('INCOME','Outros','ellipsis','#929BAA','#EDF0F5', 4)
    ) AS d(kind, name, icon, color, background, position)
    ON CONFLICT ("userId", "type", "name") DO NOTHING;
END;
$$;

-- Existing users keep all existing categories and associations.
SELECT initialize_finance_categories("id") FROM "User";

CREATE FUNCTION initialize_finance_categories_on_user_insert() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
    PERFORM initialize_finance_categories(NEW."id");
    RETURN NEW;
END;
$$;
CREATE TRIGGER finance_categories_after_user_insert
AFTER INSERT ON "User" FOR EACH ROW EXECUTE FUNCTION initialize_finance_categories_on_user_insert();
