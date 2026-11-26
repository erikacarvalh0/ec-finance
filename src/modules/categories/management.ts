import { Prisma, type PrismaClient } from '@prisma/client';
import { z } from 'zod';

export const categoryType = z.enum(['EXPENSE', 'INCOME']);
export const categoryInput = z.object({
    name: z.string().trim().min(1).max(100),
    color: z.string().regex(/^#[0-9a-fA-F]{6}$/),
    iconBackground: z.string().regex(/^#[0-9a-fA-F]{6}$/),
    icon: z.enum(['shopping-cart','house','car-front','heart','ellipsis','wallet','briefcase','trending-up','arrow-left-right']),
}).strict();
export const command = z.discriminatedUnion('action', [
    z.object({ action: z.literal('create'), type: categoryType, category: categoryInput }).strict(),
    z.object({ action: z.literal('edit'), id: z.string().min(1), category: categoryInput }).strict(),
    z.object({ action: z.literal('delete'), id: z.string().min(1) }).strict(),
    z.object({ action: z.literal('reorder'), type: categoryType, ids: z.array(z.string().min(1)).max(1000) }).strict(),
]);
export class CategoryConflict extends Error {}
export class CategoryMissing extends Error {}
const select = { id: true, name: true, type: true, color: true, iconBackground: true, icon: true, sortOrder: true } as const;
export type ManagedCategory = Prisma.CategoryGetPayload<{select: typeof select}>;

export function listManagedCategories(db: Pick<PrismaClient,'category'>, userId: string) {
    return db.category.findMany({ where: { userId }, select, orderBy: [{sortOrder:'asc'},{name:'asc'},{id:'asc'}] });
}
export function validateOrder(existing: string[], requested: string[]) {
    if (existing.length !== requested.length || new Set(requested).size !== requested.length || requested.some(id => !existing.includes(id))) {
        throw new CategoryConflict('A lista mudou. Atualize e tente novamente.');
    }
}
export async function manageCategory(db: PrismaClient, userId: string, input: unknown) {
    const data = command.parse(input);
    return db.$transaction(async tx => {
        if (data.action === 'create') {
            const last = await tx.category.aggregate({where:{userId,type:data.type},_max:{sortOrder:true}});
            await tx.category.create({data:{userId,type:data.type,...data.category,sortOrder:(last._max.sortOrder ?? -1)+1}});
        } else if (data.action === 'reorder') {
            const existing = await tx.category.findMany({where:{userId,type:data.type},select:{id:true}});
            validateOrder(existing.map(row=>row.id),data.ids);
            for (const [sortOrder,id] of data.ids.entries()) {
                await tx.category.update({where:{id,userId},data:{sortOrder}});
            }
        } else {
            const row = await tx.category.findFirst({where:{id:data.id,userId},select:{id:true,_count:{select:{expenses:true,incomes:true,transactions:true,budgets:true}}}});
            if (!row) throw new CategoryMissing('Categoria não encontrada.');
            if (data.action === 'edit') {
                await tx.category.update({where:{id:row.id,userId},data:data.category});
            } else {
                if (Object.values(row._count).some(count=>count>0)) throw new CategoryConflict('Categoria em uso. Reclassifique os registros antes de excluir.');
                await tx.category.delete({where:{id:row.id,userId}});
            }
        }
        return listManagedCategories(tx,userId);
    }, {isolationLevel: Prisma.TransactionIsolationLevel.Serializable});
}
