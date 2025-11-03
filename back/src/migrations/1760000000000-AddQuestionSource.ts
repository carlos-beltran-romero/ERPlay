import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddQuestionSource1760000000000 implements MigrationInterface {
  name = 'AddQuestionSource1760000000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      "ALTER TABLE `questions` ADD `source` enum('catalog','student') NOT NULL DEFAULT 'catalog'"
    );
    await queryRunner.query(
      "UPDATE `questions` q LEFT JOIN `users` u ON u.id = q.creatorId SET q.source = CASE WHEN u.role = 'alumno' THEN 'student' ELSE 'catalog' END"
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query('ALTER TABLE `questions` DROP COLUMN `source`');
  }
}
