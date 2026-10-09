import { join } from 'path';
import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ServeStaticModule } from '@nestjs/serve-static';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { QuestionsModule } from './questions/questions.module';
import { TopicsModule } from './topics/topics.module';
import { TicketsModule } from './tickets/tickets.module';
import { UsersModule } from './users/users.module';
import { AuthModule } from './auth/auth.module';
import { ContactMessagesModule } from './contact-messages/contact-messages.module';
import { ProgressModule, PROGRESS_ENTITIES } from './progress/progress.module';
import { RefreshToken } from './auth/entities/refresh-token.entity';
import { CreateUserProgress1760000000000 } from './migrations/1760000000000-CreateUserProgress';
import { AddQuestionTopicOrder1760100000000 } from './migrations/1760100000000-AddQuestionTopicOrder';
import { CreateRefreshTokens1760200000000 } from './migrations/1760200000000-CreateRefreshTokens';
import { Question } from './questions/entities/question.entity';
import { Topic } from './topics/entities/topic.entity';
import { Ticket } from './tickets/entities/ticket.entity';
import { User } from './users/entities/user.entity';
import { ContactMessage } from './contact-messages/entities/contact-message.entity';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    ServeStaticModule.forRoot({
      rootPath: join(__dirname, '..', 'public'),
      serveRoot: '/media',
    }),
    TypeOrmModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (config: ConfigService) => {
        const databaseUrl = config.get<string>('DATABASE_URL');
        const ssl =
          config.get<string>('DB_SSL', 'false') === 'true'
            ? { rejectUnauthorized: false }
            : false;

        return {
          type: 'postgres' as const,
          ...(databaseUrl
            ? { url: databaseUrl }
            : {
                host: config.get<string>('DB_HOST', 'localhost'),
                port: config.get<number>('DB_PORT', 5432),
                username: config.get<string>('DB_USERNAME', 'postgres'),
                password: config.get<string>('DB_PASSWORD', 'postgres'),
                database: config.get<string>('DB_NAME', 'avtotez_guliston'),
              }),
          entities: [Question, Topic, Ticket, User, ContactMessage, RefreshToken, ...PROGRESS_ENTITIES],
          synchronize: config.get<string>('NODE_ENV', 'development') !== 'production',
          // Production'da yangi jadvallar faqat migration orqali yaratiladi — ilova ishga tushganda avtomatik bajariladi.
          migrations: [
            CreateUserProgress1760000000000,
            AddQuestionTopicOrder1760100000000,
            CreateRefreshTokens1760200000000,
          ],
          migrationsRun: true,
          ssl,
        };
      },
    }),
    QuestionsModule,
    TopicsModule,
    TicketsModule,
    UsersModule,
    AuthModule,
    ContactMessagesModule,
    ProgressModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
