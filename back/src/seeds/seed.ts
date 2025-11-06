import bcrypt from 'bcrypt';

import { AppDataSource } from '../data-source';
import { User, UserRole } from '../models/User';
import { Diagram } from '../models/Diagram';
import { Question } from '../models/Question';
import { Option } from '../models/Option';
import { TestSession } from '../models/TestSession';
import { TestResult } from '../models/TestResult';
import { TestEvent } from '../models/TestEvent';
import { Claim, ClaimStatus } from '../models/Claim';
import { WeeklyGoal } from '../models/WeeklyGoal';

async function seed() {
  try {
    if (!AppDataSource.isInitialized) {
      await AppDataSource.initialize();
    }

    const userRepository = AppDataSource.getRepository(User);
    const existingUsers = await userRepository.count();

    if (existingUsers > 0) {
      console.log('⚠️  La base de datos ya contiene registros, se omite la semilla para evitar duplicados.');
      return;
    }

    await AppDataSource.transaction(async (manager) => {
      const supervisorPassword = await bcrypt.hash('Supervisor123*', 10);
      const studentPassword = await bcrypt.hash('Alumno123*', 10);

      const supervisor = manager.getRepository(User).create({
        name: 'María',
        lastName: 'Suárez',
        email: 'maria.supervisor@erplay.com',
        passwordHash: supervisorPassword,
        role: UserRole.SUPERVISOR,
      });

      const studentAna = manager.getRepository(User).create({
        name: 'Ana',
        lastName: 'Pérez',
        email: 'ana.perez@erplay.com',
        passwordHash: studentPassword,
        role: UserRole.STUDENT,
      });

      const studentLuis = manager.getRepository(User).create({
        name: 'Luis',
        lastName: 'Martínez',
        email: 'luis.martinez@erplay.com',
        passwordHash: studentPassword,
        role: UserRole.STUDENT,
      });

      await manager.getRepository(User).save([supervisor, studentAna, studentLuis]);

      const diagramRepo = manager.getRepository(Diagram);
      const erLibrary = diagramRepo.create({
        title: 'Biblioteca Universitaria',
        filename: 'biblioteca.png',
        path: '/uploads/diagrams/biblioteca.png',
      });

      const erHospital = diagramRepo.create({
        title: 'Gestión Hospitalaria',
        filename: 'hospital.png',
        path: '/uploads/diagrams/hospital.png',
      });

      await diagramRepo.save([erLibrary, erHospital]);

      const questionRepo = manager.getRepository(Question);
      const optionRepo = manager.getRepository(Option);

      const libraryQuestions: Question[] = [];
      const hospitalQuestions: Question[] = [];

      const questionsData = [
        {
          prompt: '¿Cuál es la cardinalidad entre Autor y Libro?',
          hint: 'Observa las relaciones AutorLibro en el diagrama.',
          correctOptionIndex: 1,
          diagram: erLibrary,
          target: libraryQuestions,
          options: ['1:1', '1:N', 'N:1', 'N:M'],
        },
        {
          prompt: '¿Qué entidad almacena los préstamos realizados?',
          hint: 'Busca entidades con fechas de devolución.',
          correctOptionIndex: 2,
          diagram: erLibrary,
          target: libraryQuestions,
          options: ['Libro', 'Usuario', 'Prestamo', 'Bibliotecario'],
        },
        {
          prompt: '¿Cuál es la entidad débil en el diagrama del hospital?',
          hint: 'Fíjate en aquellas que dependen de Paciente.',
          correctOptionIndex: 0,
          diagram: erHospital,
          target: hospitalQuestions,
          options: ['HistorialClinico', 'Doctor', 'Habitacion', 'Tratamiento'],
        },
      ];

      for (const questionData of questionsData) {
        const question = questionRepo.create({
          prompt: questionData.prompt,
          hint: questionData.hint,
          correctOptionIndex: questionData.correctOptionIndex,
          diagram: questionData.diagram,
          creator: supervisor,
          options: questionData.options.map((text, index) =>
            optionRepo.create({ text, orderIndex: index })
          ),
        });

        const saved = await questionRepo.save(question);
        const withOptions = await questionRepo.findOne({
          where: { id: saved.id },
          relations: ['options', 'diagram'],
        });

        if (!withOptions) {
          throw new Error('No se pudo recuperar la pregunta recién creada.');
        }

        questionData.target.push(withOptions);
      }

      const sessionRepo = manager.getRepository(TestSession);
      const session = sessionRepo.create({
        user: studentAna,
        diagram: erLibrary,
        mode: 'learning',
        totalQuestions: 3,
        correctCount: 2,
        incorrectCount: 1,
        durationSeconds: 540,
        score: 78,
        metadata: { source: 'seed', timeLimit: 900 },
        completedAt: new Date(),
      });

      await sessionRepo.save(session);

      const resultRepo = manager.getRepository(TestResult);
      const questionOptions = (question: Question) =>
        [...(question.options ?? [])].sort((a, b) => a.orderIndex - b.orderIndex).map((opt) => opt.text);

      const firstResult = resultRepo.create({
        session,
        question: libraryQuestions[0],
        orderIndex: 1,
        promptSnapshot: libraryQuestions[0].prompt,
        optionsSnapshot: questionOptions(libraryQuestions[0]),
        correctIndexAtTest: libraryQuestions[0].correctOptionIndex,
        selectedIndex: 1,
        usedHint: false,
        revealedAnswer: false,
        attemptsCount: 1,
        timeSpentSeconds: 45,
        isCorrect: true,
      });

      const secondResult = resultRepo.create({
        session,
        question: libraryQuestions[1],
        orderIndex: 2,
        promptSnapshot: libraryQuestions[1].prompt,
        optionsSnapshot: questionOptions(libraryQuestions[1]),
        correctIndexAtTest: libraryQuestions[1].correctOptionIndex,
        selectedIndex: 1,
        usedHint: true,
        revealedAnswer: false,
        attemptsCount: 2,
        timeSpentSeconds: 90,
        isCorrect: false,
      });

      await resultRepo.save([firstResult, secondResult]);

      const eventRepo = manager.getRepository(TestEvent);
      await eventRepo.save([
        eventRepo.create({
          session,
          result: null,
          type: 'start_session',
          payload: { startedAt: new Date().toISOString() },
        }),
        eventRepo.create({
          session,
          result: secondResult,
          type: 'submit_answer',
          payload: { selectedIndex: secondResult.selectedIndex, isCorrect: false },
        }),
      ]);

      const claimRepo = manager.getRepository(Claim);
      await claimRepo.save(
        claimRepo.create({
          status: ClaimStatus.APPROVED,
          question: libraryQuestions[1],
          testResult: secondResult,
          diagram: erLibrary,
          student: studentAna,
          promptSnapshot: libraryQuestions[1].prompt,
          optionsSnapshot: questionOptions(libraryQuestions[1]),
          chosenIndex: secondResult.selectedIndex ?? 0,
          correctIndexAtSubmission: libraryQuestions[1].correctOptionIndex,
          explanation: 'Creo que la respuesta correcta es Prestamo porque almacena las fechas.',
          reviewer: supervisor,
          reviewerComment: 'Se ajustó la respuesta oficial para reflejar la aclaración.',
          reviewedAt: new Date(),
        })
      );

      const goalRepo = manager.getRepository(WeeklyGoal);
      const startOfWeek = new Date();
      const day = startOfWeek.getDay();
      const diff = startOfWeek.getDate() - day + (day === 0 ? -6 : 1);
      startOfWeek.setDate(diff);
      startOfWeek.setHours(0, 0, 0, 0);
      const endOfWeek = new Date(startOfWeek);
      endOfWeek.setDate(startOfWeek.getDate() + 6);

      await goalRepo.save(
        goalRepo.create({
          weekStart: startOfWeek.toISOString().slice(0, 10),
          weekEnd: endOfWeek.toISOString().slice(0, 10),
          targetTests: 12,
          createdBy: supervisor,
        })
      );

    });

    console.log('✅ Base de datos poblada con datos de ejemplo.');
  } catch (error) {
    console.error('❌ Error generando la semilla:', error);
    process.exitCode = 1;
  } finally {
    if (AppDataSource.isInitialized) {
      await AppDataSource.destroy();
    }
  }
}

seed();
