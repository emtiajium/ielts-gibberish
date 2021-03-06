import { EntityRepository, Raw, Repository } from 'typeorm';
import LeitnerSystems from '@/vocabulary/domains/LeitnerSystems';
import LeitnerBoxType from '@/vocabulary/domains/LeitnerBoxType';
import SearchResult from '@/common/domains/SearchResult';
import Pagination from '@/common/domains/Pagination';
import { getFormattedTomorrow } from '@/common/utils/moment-util';
import LeitnerSystemsLoverUsersReport from '@/user/domains/LeitnerSystemsLoverUsersReport';

@EntityRepository(LeitnerSystems)
export default class LeitnerSystemsRepository extends Repository<LeitnerSystems> {
    // shitty code just for the easiness of jest.spyOn()
    getTomorrow(): string {
        return getFormattedTomorrow();
    }

    async getBoxItems(
        userId: string,
        box: LeitnerBoxType,
        pagination: Pagination,
    ): Promise<SearchResult<LeitnerSystems>> {
        const { pageSize, pageNumber } = pagination;
        const toBeSkipped = pageSize * (pageNumber - 1);

        const [items, total] = await this.findAndCount({
            where: {
                userId,
                currentBox: box,
                boxAppearanceDate: Raw((alias) => `${alias} < '${this.getTomorrow()}'::DATE`),
            },
            select: ['vocabularyId', 'updatedAt'],
            skip: toBeSkipped,
            take: pageSize,
            order: { createdAt: 'ASC' },
        });

        return new SearchResult<LeitnerSystems>(items, total);
    }

    countBoxItems(userId: string, box: LeitnerBoxType): Promise<number> {
        return this.count({
            where: {
                userId,
                currentBox: box,
            },
        });
    }

    getLeitnerLoverUsers(): Promise<LeitnerSystemsLoverUsersReport[]> {
        return this.query(`
            SELECT DISTINCT U.username, COUNT(DISTINCT "vocabularyId")::INTEGER AS "vocabCount"
            FROM "LeitnerSystems"
                     INNER JOIN "User" AS U ON "LeitnerSystems"."userId" = U.id
            GROUP BY U.username
            ORDER BY "vocabCount" DESC;
        `);
    }
}
