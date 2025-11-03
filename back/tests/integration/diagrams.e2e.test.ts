import request from 'supertest';
import jwt from 'jsonwebtoken';
import bcrypt from 'bcrypt';
import { AppDataSource } from '../../src/data-source';
import app from '../../src/server';
import { Diagram } from '../../src/models/Diagram';
import { Option } from '../../src/models/Option';
import { Question, QuestionSource, ReviewStatus } from '../../src/models/Question';
import { User, UserRole } from '../../src/models/User';
import { DiagramsService } from '../../src/services/diagrams';

describe('Diagrams API', () => {
  let supervisor: User;
  let student: User;
  let diagram: Diagram;
  let accessToken: string;

  beforeAll(async () => {
    if (!AppDataSource.isInitialized) {
      await AppDataSource.initialize();
    }
    await AppDataSource.runMigrations();

    const userRepo = AppDataSource.getRepository(User);
    supervisor = userRepo.create({
      name: 'Sara',
      lastName: 'Campos',
      email: 'supervisor@example.com',
      passwordHash: await bcrypt.hash('password', 10),
      role: UserRole.SUPERVISOR,
    });
    student = userRepo.create({
      name: 'Leo',
      lastName: 'Pérez',
      email: 'student@example.com',
      passwordHash: await bcrypt.hash('password', 10),
      role: UserRole.STUDENT,
    });
    await userRepo.save([supervisor, student]);

    const diagramsService = new DiagramsService();
    const created = await diagramsService.createDiagram({
      title: 'Sistema digestivo',
      creatorId: supervisor.id,
      file: { filename: 'diagram.png', path: 'diagram.png' },
      questions: [
        {
          prompt: '¿Cuál es el órgano responsable de absorber nutrientes?',
          hint: 'Piensa en el intestino',
          options: ['Intestino delgado', 'Estómago'],
          correctIndex: 0,
        },
      ],
    });

    diagram = await AppDataSource.getRepository(Diagram).findOneByOrFail({ id: created.id });

    const questionRepo = AppDataSource.getRepository(Question);
    const optionRepo = AppDataSource.getRepository(Option);
    const studentQuestion = questionRepo.create({
      prompt: 'Pregunta creada por estudiante',
      hint: 'Región posterior del sistema',
      correctOptionIndex: 1,
      diagram,
      creator: student,
      source: QuestionSource.STUDENT,
      status: ReviewStatus.APPROVED,
      reviewedBy: supervisor,
      reviewedAt: new Date(),
      reviewComment: null,
    });
    await questionRepo.save(studentQuestion);

    const studentOptions = ['Esófago', 'Recto'].map((text, orderIndex) =>
      optionRepo.create({ text, orderIndex, question: studentQuestion })
    );
    await optionRepo.save(studentOptions);

    accessToken = jwt.sign({ id: supervisor.id, role: supervisor.role }, process.env.JWT_SECRET!);
  });

  afterAll(async () => {
    if (AppDataSource.isInitialized) {
      await AppDataSource.dropDatabase();
      await AppDataSource.destroy();
    }
  });

  it('preserves student questions when catalog entries are updated', async () => {
    const questionRepo = AppDataSource.getRepository(Question);
    const catalogQuestion = await questionRepo.findOne({
      where: { diagram: { id: diagram.id }, source: QuestionSource.CATALOG },
      relations: { options: true },
    });
    expect(catalogQuestion).not.toBeNull();

    const response = await request(app)
      .put(`/api/diagrams/${diagram.id}`)
      .set('Authorization', `Bearer ${accessToken}`)
      .field('title', 'Sistema digestivo actualizado')
      .field(
        'questions',
        JSON.stringify([
          {
            id: catalogQuestion!.id,
            prompt: 'Órgano que absorbe nutrientes',
            hint: 'Ubicado tras el estómago',
            options: ['Intestino delgado', 'Intestino grueso'],
            correctIndex: 0,
          },
        ]),
      );

    expect(response.status).toBe(200);

    const questions = await questionRepo.find({
      where: { diagram: { id: diagram.id } },
    });
    const studentQuestions = questions.filter((q) => q.source === QuestionSource.STUDENT);
    expect(studentQuestions).toHaveLength(1);
    expect(studentQuestions[0].prompt).toBe('Pregunta creada por estudiante');
  });
});
