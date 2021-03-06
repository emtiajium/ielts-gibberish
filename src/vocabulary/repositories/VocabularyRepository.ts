import { EntityRepository, Repository } from 'typeorm';
import Vocabulary from '@/vocabulary/domains/Vocabulary';
import VocabularySearch from '@/vocabulary/domains/VocabularySearch';
import SearchResult from '@/common/domains/SearchResult';
import * as _ from 'lodash';
import { SortDirection, SupportedSortFields } from '@/common/domains/Sort';
import VocabularySearchCoverage from '@/vocabulary/domains/VocabularySearchCoverage';

@EntityRepository(Vocabulary)
export default class VocabularyRepository extends Repository<Vocabulary> {
    async removeVocabularyById(id: string): Promise<void> {
        await this.delete({ id });
    }

    async findVocabularies(
        userId: string,
        cohortId: string,
        vocabularySearch: VocabularySearch,
    ): Promise<SearchResult<Vocabulary>> {
        const {
            pagination: { pageSize, pageNumber },
            sort,
            searchKeyword,
            vocabularySearchCoverage,
        } = vocabularySearch;

        const fetchNotHavingDefinitionOnly = vocabularySearch?.fetchNotHavingDefinitionOnly ?? false;

        const currentPage = pageSize * (pageNumber - 1);

        const searchKeywordParameterPosition = 5;

        let vocabularyQueryResult = await this.query(
            `
                SELECT vocabulary.*,
                       json_agg(definition.*)                             AS definitions,
                       COUNT("leitnerSystems"."userId")::INTEGER::BOOLEAN AS "isInLeitnerBox",
                       (COUNT(*) OVER ())::INTEGER                        AS "totalNumberOfVocabularies"
                FROM "Vocabulary" AS vocabulary
                         LEFT JOIN "Definition" AS definition ON vocabulary.id = definition."vocabularyId"
                         LEFT JOIN "LeitnerSystems" AS "leitnerSystems"
                                   ON vocabulary.id = "leitnerSystems"."vocabularyId" AND
                                      "leitnerSystems"."userId" = $1
                WHERE vocabulary."cohortId" = $2
                    ${this.getSearchQuery(searchKeyword, vocabularySearchCoverage, searchKeywordParameterPosition)}
                    ${fetchNotHavingDefinitionOnly ? `AND definition IS NULL` : ''}
                GROUP BY vocabulary.id
                ORDER BY vocabulary."${sort?.field || SupportedSortFields.updatedAt}" ${
                sort?.direction || SortDirection.DESC
            }
                OFFSET $3 LIMIT $4;
            `,
            searchKeyword
                ? [userId, cohortId, currentPage, pageSize, `%${searchKeyword}%`]
                : [userId, cohortId, currentPage, pageSize],
        );

        vocabularyQueryResult = this.rejectNull(vocabularyQueryResult);

        // TODO remove "totalNumberOfVocabularies" from the "vocabularyQueryResult"

        return new SearchResult(vocabularyQueryResult, vocabularyQueryResult[0]?.totalNumberOfVocabularies || 0);
    }

    private rejectNull(results: Vocabulary[]): Vocabulary[] {
        // as LEFT join results[index].definitions can be [null]
        return _.map(results, (result) => ({
            ...result,
            definitions: _.isNull(result.definitions[0])
                ? []
                : _.isNull(result.definitions[0].id)
                ? []
                : result.definitions,
        }));
    }

    private getSearchQuery(
        searchKeyword: string,
        vocabularySearchCoverage: VocabularySearchCoverage = { word: true } as VocabularySearchCoverage,
        queryParameterPosition: number,
    ): string {
        if (!searchKeyword) {
            return ``;
        }

        const searchBuilder = {
            word: `vocabulary.word ILIKE $${queryParameterPosition}`,
            linkerWords: `vocabulary."linkerWords"::TEXT ILIKE $${queryParameterPosition}`,
            genericNotes: `vocabulary."genericNotes"::TEXT ILIKE $${queryParameterPosition}`,
            meaning: `definition.meaning ILIKE $${queryParameterPosition}`,
            examples: `definition.examples::TEXT ILIKE $${queryParameterPosition}`,
            notes: `definition.notes::TEXT ILIKE $${queryParameterPosition}`,
        };

        Object.keys(searchBuilder).forEach((key) => {
            if (!vocabularySearchCoverage[key]) {
                delete searchBuilder[key];
            }
        });

        return `AND (${Object.values(searchBuilder).join(' OR ')})`;
    }

    async findVocabularyById(id: string, userId: string): Promise<Vocabulary> {
        const results = await this.query(
            `
                SELECT vocabulary.id,
                       vocabulary."cohortId",
                       vocabulary.word,
                       vocabulary."genericNotes",
                       vocabulary."genericExternalLinks",
                       vocabulary."linkerWords",
                       vocabulary."isDraft",
                       json_agg(json_build_object('id', definition.id,
                                                  'vocabularyId', definition."vocabularyId",
                                                  'meaning', definition.meaning,
                                                  'examples', definition.examples,
                                                  'notes', definition.notes,
                                                  'externalLinks', definition."externalLinks")) AS definitions,
                       COUNT("leitnerSystems"."userId")::INTEGER::BOOLEAN                       AS "isInLeitnerBox"
                FROM "Vocabulary" AS vocabulary
                         LEFT JOIN (SELECT *
                                    FROM "Definition"
                                    WHERE "vocabularyId" = $1
                                    ORDER BY "createdAt" ASC
                ) AS definition ON vocabulary.id = definition."vocabularyId"
                         LEFT JOIN "LeitnerSystems" AS "leitnerSystems"
                                   ON vocabulary.id = "leitnerSystems"."vocabularyId" AND
                                      "leitnerSystems"."userId" = $2
                WHERE vocabulary.id = $1
                GROUP BY vocabulary.id;
            `,
            [id, userId],
        );

        return this.rejectNull(results)[0];
    }

    async getSingleVocabularyByCohortId(cohortId: string): Promise<Vocabulary> {
        const queryResult = await this.query(
            `SELECT *
             FROM "Vocabulary"
             WHERE "cohortId" = $1;`,
            [cohortId],
        );
        return queryResult[0];
    }

    async isVocabularyExist(id: string, cohortId: string): Promise<boolean> {
        const vocabulary = await this.query(
            `SELECT id
             FROM "Vocabulary"
             WHERE id = $1
               AND "cohortId" = $2
             LIMIT 1;`,
            [id, cohortId],
        );
        return !!vocabulary[0];
    }

    findWords(ids: string[]): Promise<Pick<Vocabulary, 'id' | 'word'>[]> {
        return this.query(
            `SELECT id, word
             FROM "Vocabulary"
             WHERE id = ANY (ARRAY [${ids.map((id) => `'${id}'`)}]::UUID[]);`,
        );
    }
}
