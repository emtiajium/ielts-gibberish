import { Column, Entity, OneToMany } from 'typeorm';
import {
    ArrayNotEmpty,
    IsArray,
    IsBoolean,
    IsDefined,
    IsNotEmpty,
    IsOptional,
    IsString,
    IsUrl,
    IsUUID,
    ValidateIf,
    ValidateNested,
} from 'class-validator';
import Definition from '@/vocabulary/domains/Definition';
import { plainToClass, Transform, Type } from 'class-transformer';
import Cohort from '@/user/domains/Cohort';
import * as _ from 'lodash';
import BaseEntityWithMandatoryId from '@/common/domains/BaseEntityWithMandatoryId';
import { ApiHideProperty } from '@nestjs/swagger';

@Entity('Vocabulary')
export default class Vocabulary extends BaseEntityWithMandatoryId {
    @Column({ type: 'varchar' })
    @Transform(({ value }) => _.capitalize(value))
    @IsNotEmpty()
    @IsString()
    @IsDefined()
    word: string;

    @Column({ type: 'varchar', array: true, default: [] })
    @IsArray()
    @IsOptional()
    genericNotes?: string[];

    @Column({ type: 'varchar', array: true, default: [] })
    @ValidateIf((vocabulary) => !!vocabulary.genericExternalLinks)
    @IsUrl(undefined, { each: true })
    @IsArray()
    @IsOptional()
    genericExternalLinks?: string[];

    @Column({ type: 'varchar', array: true, default: [] })
    @Transform(({ value }) => _.map(value, (linkerWord) => _.capitalize(linkerWord)))
    @IsArray()
    @IsOptional()
    linkerWords?: string[];

    @Column({ type: 'boolean' })
    @IsBoolean()
    isDraft: boolean;

    @OneToMany(() => Definition, (definition) => definition.vocabulary, { eager: true, cascade: true })
    @ValidateIf((vocabulary) => vocabulary.isDraft === false || _.isEmpty(vocabulary.definitions) === false)
    @ValidateNested({ each: true })
    @ArrayNotEmpty()
    @IsArray()
    @Type(() => Definition)
    definitions?: Definition[];

    @ApiHideProperty()
    @OneToMany(() => Cohort, (cohort) => cohort.id, { eager: false, cascade: false })
    @IsOptional()
    @Type(() => Cohort)
    cohort?: Cohort;

    @ApiHideProperty()
    @Column({ type: 'uuid', nullable: false })
    @IsUUID()
    @IsOptional()
    cohortId?: string;

    @ApiHideProperty()
    @IsOptional()
    isInLeitnerBox?: boolean;

    static populateDefinitions(vocabulary: Vocabulary): Vocabulary {
        const vocabularyInstance = plainToClass(Vocabulary, vocabulary);
        if (!_.isEmpty(vocabulary.definitions)) {
            vocabularyInstance.isDraft = false;
            vocabularyInstance.definitions = vocabulary.definitions.map((definition) =>
                Definition.create(vocabulary.id, definition),
            );
        }
        return vocabularyInstance;
    }
}
