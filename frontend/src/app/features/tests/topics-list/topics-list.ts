import { Component, computed, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { TopicsApiService } from '../../../core/services/topics-api.service';
import { QuestionsStore } from '../../../core/services/questions-store.service';
import { TranslateService } from '../../../core/services/translate.service';
import { Topic } from '../../../core/models/question.model';

interface TopicTile {
  topic: Topic;
  count: number;
}

@Component({
  selector: 'app-topics-list',
  imports: [RouterLink],
  templateUrl: './topics-list.html',
})
export class TopicsList {
  private readonly topicsApi = inject(TopicsApiService);
  protected readonly store = inject(QuestionsStore);
  protected readonly translate = inject(TranslateService);

  readonly loading = signal(true);
  readonly search = signal('');
  private readonly topics = signal<Topic[]>([]);

  constructor() {
    this.topicsApi.findAll().subscribe({
      next: (topics) => {
        this.topics.set(topics);
        this.loading.set(false);
      },
      error: () => this.loading.set(false),
    });
  }

  readonly tiles = computed<TopicTile[]>(() => {
    const query = this.search().trim().toLowerCase();
    return this.topics()
      .map((topic) => ({ topic, count: this.store.byTopic(topic.id).length }))
      .filter((tile) => !query || tile.topic.name.toLowerCase().includes(query));
  });
}
