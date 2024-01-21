import { JsonPipe } from '@angular/common';
import { HttpClient, HttpClientModule } from '@angular/common/http';
import { AfterViewInit, Component, signal } from '@angular/core';
import { ActivatedRoute, Router, RouterOutlet } from '@angular/router';
import { SwPush, SwUpdate } from '@angular/service-worker';
import { lastValueFrom } from 'rxjs';
import { delay, take, tap } from 'rxjs/operators';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [RouterOutlet, HttpClientModule, JsonPipe],
  templateUrl: './app.component.html',
  styleUrl: './app.component.scss'
})
export class AppComponent implements AfterViewInit {
  public pushSubscription = signal<PushSubscription | null>(null);
  public notificationMessages = signal<unknown[]>([]);
  public lastClickEvent = signal<string | null>(null);
  public errorMessage = signal<string | null>(null);
  public isOpenedFromNotification = signal<boolean>(false);

  private readonly netlifyApiBaseUrl = 'https://ng-web-push-example.netlify.app/.netlify/functions/api';
  private readonly serverPublicKey = 'BLBXQXDsaEO-HGQZZK0a0_1BNA16631qK0kvpj3NbD6p4LKwN6Ks4VPnwuvtYSyR5Yw5qdGIyVLgC_oH1oBIYa8';

  constructor(
    private readonly swPush: SwPush,
    private readonly swUpdate: SwUpdate,
    private readonly http: HttpClient,
    private readonly route: ActivatedRoute,
    private readonly router: Router,
  ) { }

  public ngAfterViewInit(): void {
    if (!this.swPush.isEnabled) {
      this.errorMessage.set('❌ Service Worker not enabled');
      return;
    }

    this.route.queryParams.subscribe((queryParams) => {
      if (queryParams['source'] === 'notification') {
        this.isOpenedFromNotification.set(true);
        setTimeout(() => {
          this.router.navigate(
            ['/'],
            { queryParams: { source: undefined }, replaceUrl: true }
          );
        }, 4000);
      }
    });

    this.swUpdate.checkForUpdate().then((hasUpdate) => {
      if (hasUpdate) {
        window.location.reload();
      }
    });

    this.swPush.subscription.pipe(take(1)).subscribe((sub) => {
      this.pushSubscription.set(sub);
    });

    this.swPush.messages.subscribe((m) => {
      this.notificationMessages.update((oldValue) => ([...oldValue, m]));
    });

    this.swPush.notificationClicks.pipe(
      tap((clickEvent) => {
        this.lastClickEvent.set(`${clickEvent.action} | ${clickEvent.notification.title}`);
      }),
      delay(5000),
    )
      .subscribe(() => this.lastClickEvent.set(null));
  }

  public async subscribe(): Promise<void> {
    this.errorMessage.set(null);

    if (!this.swPush.isEnabled) {
      this.errorMessage.set('❌ Service Worker not enabled');
      return;
    }

    const sub = this.pushSubscription() ?? await this.swPush.requestSubscription({ serverPublicKey: this.serverPublicKey });

    try {
      await lastValueFrom(
        this.http.post(`${this.netlifyApiBaseUrl}/subscribe`, sub.toJSON(), {
          headers: {
            'content-type': 'application/json',
          },
        })
      );

      this.pushSubscription.set(sub);
    } catch (err) {
      this.errorMessage.set((err as Error).message);
    }
  }

  public async unsubscribe(): Promise<void> {
    this.errorMessage.set(null);

    if (!this.swPush.isEnabled || this.pushSubscription() === null) {
      return;
    }

    try {
      await lastValueFrom(
        this.http.delete(`${this.netlifyApiBaseUrl}/unsubscribe`, {
          body: this.pushSubscription()?.toJSON(),
          headers: {
            'content-type': 'application/json',
          },
        }),
      );
      await this.swPush.unsubscribe();
      this.pushSubscription.set(null);
    } catch (err) {
      this.errorMessage.set((err as Error).message);
    }
  }

  public trigger(): void {
    this.errorMessage.set(null);

    if (!this.swPush.isEnabled || this.pushSubscription() === null) {
      return;
    }

    this.http.post(`${this.netlifyApiBaseUrl}/send-message`, undefined, {
      headers: {
        'content-type': 'application/json',
      },
    }).subscribe({
      error: (err: Error) => {
        this.errorMessage.set((err as Error).message);
      },
    });
  }
}
