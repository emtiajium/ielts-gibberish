import { EntityRepository, Repository } from 'typeorm';
import Cohort from '@/user/domains/Cohort';

@EntityRepository(Cohort)
export default class CohortRepository extends Repository<Cohort> {
    async insertIfNotExists(cohort: Cohort): Promise<void> {
        await this.createQueryBuilder()
            .insert()
            .into(Cohort)
            .values({ name: () => `'${cohort.name}'::VARCHAR`, userIds: () => 'ARRAY []::UUID[]' })
            .onConflict(`("name") DO NOTHING`)
            .printSql()
            .execute();
    }

    async updateUsersToCohort(id: string, userIds: string[]): Promise<void> {
        const clonedUserIds = userIds.map((userId) => `'${userId}'`);
        await this.query(
            `
            UPDATE "Cohort"
            SET "userIds" = ARRAY [${clonedUserIds}]::UUID[]
            WHERE id = $1::UUID;
        `,
            [id],
        );
    }
}
