import { Component, computed, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { TopicsApiService } from '../../../core/services/topics-api.service';
import { QuestionsStore } from '../../../core/services/questions-store.service';
import { ProgressService } from '../../../core/services/progress.service';
import { TranslateService } from '../../../core/services/translate.service';
import { Topic } from '../../../core/models/question.model';

interface TopicTile {
  topic: Topic;
  count: number;
  /** Belgilangan (to'g'ri yoki noto'g'ri) savollar ulushi, 0–100. */
  percent: number;
}

interface TopicGroup {
  category: string | null;
  tiles: TopicTile[];
}

@Component({
  selector: 'app-topics-list',
  imports: [RouterLink],
  templateUrl: './topics-list.html',
})
export class TopicsList {
  private readonly topicsApi = inject(TopicsApiService);
  protected readonly store = inject(QuestionsStore);
  private readonly progress = inject(ProgressService);
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

  readonly groups = computed<TopicGroup[]>(() => {
    const query = this.search().trim().toLowerCase();
    const correctIds = this.progress.correctIds();
    const mistakes = this.progress.mistakes();
    const tiles = this.topics()
      .map((topic) => {
        const questions = this.store.byTopic(topic.id);
        // har bir savol bir marta sanaladi — foiz 100 dan oshmaydi
        const answered = questions.filter((q) => correctIds.has(q.id) || q.id in mistakes).length;
        const percent = questions.length ? Math.round((answered / questions.length) * 100) : 0;
        return { topic, count: questions.length, percent };
      })
      .filter((tile) => !query || tile.topic.name.toLowerCase().includes(query));

    const groups: TopicGroup[] = [];
    for (const tile of tiles) {
      const category = tile.topic.category;
      const last = groups[groups.length - 1];
      if (last && last.category === category) {
        last.tiles.push(tile);
      } else {
        groups.push({ category, tiles: [tile] });
      }
    }
    return groups;
  });
}
