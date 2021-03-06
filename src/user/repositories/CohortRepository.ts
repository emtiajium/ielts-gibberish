import { EntityRepository, Repository } from 'typeorm';
import Cohort from '@/user/domains/Cohort';
import EntityNotFoundException from '@/exceptions/EntityNotFoundException';

@EntityRepository(Cohort)
export default class CohortRepository extends Repository<Cohort> {
    async insertIfNotExists(cohort: Cohort): Promise<void> {
        await this.createQueryBuilder()
            .insert()
            .into(Cohort)
            .values({ name: () => `'${cohort.name}'::VARCHAR` })
            .onConflict(`("name") DO NOTHING`)
            .execute();
    }

    async getCohortByName(name: string): Promise<Cohort> {
        // findOneOrFail() is not working as expected
        const cohort: Cohort = await this.findOne({ name });
        if (!cohort) {
            throw new EntityNotFoundException(`Cohort with name "${name}" does not exist`);
        }
        return cohort;
    }

    async findCohortById(id: string): Promise<Cohort> {
        const cohort = await this.createQueryBuilder(`cohort`)
            .where(`cohort.id = :id`, { id })
            .innerJoinAndSelect(`cohort.users`, `users`)
            .orderBy(`users.firstname`)
            .getOne();
        if (!cohort) {
            throw new EntityNotFoundException(`Cohort with id "${id}" does not exist`);
        }
        return cohort;
    }
}
