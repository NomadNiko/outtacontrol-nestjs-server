import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddXpAndLevelToUser1687334567890 implements MigrationInterface {
  name = 'AddXpAndLevelToUser1687334567890';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "user" ADD "xp" integer NOT NULL DEFAULT 0`,
    );
    await queryRunner.query(
      `ALTER TABLE "user" ADD "level" integer NOT NULL DEFAULT 1`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "user" DROP COLUMN "level"`);
    await queryRunner.query(`ALTER TABLE "user" DROP COLUMN "xp"`);
  }
}
