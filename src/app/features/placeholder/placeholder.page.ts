import { ChangeDetectionStrategy, Component, computed, inject } from '@angular/core';
import { ActivatedRoute, RouterLink } from '@angular/router';

import { ButtonComponent } from '@shared/ui/button/button.component';
import { CardComponent } from '@shared/ui/card/card.component';
import { EmptyStateComponent } from '@shared/ui/empty-state/empty-state.component';
import { PageHeaderComponent } from '@shared/ui/page-header/page-header.component';

/** Page d'attente des modules prévus mais pas encore développés. Le titre vient de `data.title`. */
@Component({
  selector: 'sysde-placeholder-page',
  imports: [RouterLink, ButtonComponent, CardComponent, EmptyStateComponent, PageHeaderComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <ui-page-header [title]="title()" />
    <ui-card>
      <ui-empty-state
        icon="clock"
        title="Ce module arrive bientôt"
        description="Cette section sera disponible dans une prochaine version, avec les données du back-end."
      >
        <a ui-button variant="primary" routerLink="/tableau-de-bord">Retour au dashboard</a>
      </ui-empty-state>
    </ui-card>
  `,
  styles: `
    :host {
      display: flex;
      flex-direction: column;
      gap: 24px;
    }
  `,
})
export class PlaceholderPage {
  private readonly route = inject(ActivatedRoute);

  protected readonly title = computed(() => (this.route.snapshot.data['title'] as string) ?? '');
}
