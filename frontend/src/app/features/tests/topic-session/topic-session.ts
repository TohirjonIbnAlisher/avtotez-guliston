import { Component, computed, inject } from '@angular/core';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { QuestionsStore } from '../../../core/services/questions-store.service';
import { TranslateService } from '../../../core/services/translate.service';
import { TestSession } from '../test-session/test-session';

@Component({
  selector: 'app-topic-session',
  imports: [TestSession, RouterLink],
  templateUrl: './topic-session.html',
})
export class TopicSession {
  private readonly route = inject(ActivatedRoute);
  protected readonly store = inject(QuestionsStore);
  protected readonly translate = inject(TranslateService);

  private readonly topicId = this.route.snapshot.paramMap.get('topicId') ?? '';

  readonly questions = computed(() => this.store.byTopic(this.topicId));
  readonly topicName = computed(() => this.questions()[0]?.topic?.name ?? '');
}
