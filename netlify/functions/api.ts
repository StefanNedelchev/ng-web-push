import { json } from 'body-parser';
import cors from 'cors';
import express, { Router, Request } from 'express';
import serverless from 'serverless-http';
// import sqlite3 from 'sqlite3';
import { SendResult, PushSubscription as WebPushSubscription, sendNotification, setVapidDetails } from 'web-push';

const vapidKeys = {
  private: 'vJaR1x_O09UIBqmt1owOZDwPBg1-PLsHuanV-0_BH3Y',
  public: 'BLBXQXDsaEO-HGQZZK0a0_1BNA16631qK0kvpj3NbD6p4LKwN6Ks4VPnwuvtYSyR5Yw5qdGIyVLgC_oH1oBIYa8',
};

let inMemoryDb: WebPushSubscription[] = [];

setVapidDetails('mailto:example@yourdomain.org', vapidKeys.public, vapidKeys.private);

function send(sub: WebPushSubscription): Promise<SendResult> {
  const notification = {
    title: 'Hey there!',
    body: 'This is a test notification.',
    icon: `https://icon-library.com/images/doge-icon/doge-icon-21.jpg`,
    timestamp: Date.now(),
    // requireInteraction: true,
    // renotify: true,
    data: {
      onActionClick: {
        default: { operation: 'focusLastFocusedOrOpen', url: '/?source=notification' },
      },
    },
  };

  return sendNotification(sub, JSON.stringify({ notification }));
}

// const db = new sqlite3.Database('subs-db.db', (err) => {
//   if (err) {
//     console.error('DB not initialized.', err);
//     return;
//   }

//   db.run(`CREATE TABLE IF NOT EXISTS PUSH_SUBS (
//     endpoint TEXT NOT NULL PRIMARY KEY,
//     p256dh VARCHAR(128) NOT NULL,
//     auth VARCHAR(32) NOT NULL)`);
// });

// interface PushSubscriptionRecord {
//   endpoint: string;
//   p256dh: string;
//   auth: string;
// }

// function getAllSubscriptions(): Promise<WebPushSubscription[]> {
//   return new Promise((resolve, reject) => {
//     db.all<PushSubscriptionRecord>('SELECT * FROM PUSH_SUBS', (err, rows) => {
//       if (err) {
//         reject(err);
//         return;
//       }

//       const subscriptions = rows.map<WebPushSubscription>((row) => ({
//         endpoint: row.endpoint,
//         keys: { p256dh: row.p256dh, auth: row.auth },
//       }));
//       resolve(subscriptions);
//     });
//   });
// }

// function saveSubscription(sub: WebPushSubscription): Promise<void> {
//   return new Promise((resolve, reject) => {
//     db.run(
//       `INSERT INTO PUSH_SUBS VALUES(:1, :2, :3)
//         ON CONFLICT(endpoint) DO UPDATE SET p256dh=:2, auth=:3`,
//       [sub.endpoint, sub.keys.p256dh, sub.keys.auth],
//       (err) => {
//         if (err) {
//           reject(err);
//           return;
//         }

//         resolve();
//       },
//     );
//   });
// }

// function deleteSubscription(endpoint: string): Promise<void> {
//   return new Promise((resolve, reject) => {
//     db.run('DELETE FROM PUSH_SUBS WHERE endpoint = ?', endpoint, (err) => {
//       if (err) {
//         reject(err);
//         return;
//       }

//       resolve();
//     });
//   });
// }

const app = express();

app.use(cors({ origin: true }));
app.use(json());

const router = Router();

router.get('/hello', (req, res) => res.send('Hello World!'));
router.post('/subscribe', (req: Request<unknown, unknown, WebPushSubscription>, res) => {
  inMemoryDb.push(req.body);
  res.status(200).send({ message: '✅ Subscription saved.' });
  // saveSubscription(req.body)
  //   .then(() => res.status(200).send({ message: '✅ Subscription saved.' }))
  //   .catch((err) => {
  //     console.log(err);
  //     res.status(422).send({ message: `❌ Subscription was not saved. ${err.message}` });
  //   });
});
router.delete('/unsubscribe', (req: Request<unknown, unknown, WebPushSubscription>, res) => {
  inMemoryDb = inMemoryDb.filter((sub) => sub.endpoint !== req.body.endpoint);
  res.status(200).send({ message: `❎ Subscription was removed.` });
  // deleteSubscription(req.body.endpoint)
  //   .then(() => res.status(200).send({ message: `❎ Subscription was removed.` }))
  //   .catch((err) => {
  //     console.log(err);
  //     res.status(422).send({ message: `❌ Subscription was not removed. ${err.message}` });
  //   });
});
router.post('/send-message', (req, res) => {
  const sendPromises = inMemoryDb.map((sub) => (
    send(sub).catch((err) => {
      if (err.statusCode === 404 || err.statusCode === 410) {
        console.log('Subscription has expired or is no longer valid: ', err.message);
        inMemoryDb = inMemoryDb.filter((s) => s.endpoint !== sub.endpoint);
      } else {
        console.error(err);
      }
    })
  ));
  Promise.all(sendPromises).then(() => {
    res.status(200).send();
  });

  // getAllSubscriptions()
  //   .then((subs) => {
  //     const sendPromises = subs.map((sub) => (
  //       send(sub).catch((err) => {
  //         if (err.statusCode === 404 || err.statusCode === 410) {
  //           console.log('Subscription has expired or is no longer valid: ', err.message);
  //           deleteSubscription(sub.endpoint);
  //         } else {
  //           console.error(err);
  //         }
  //       })
  //     ));
  //     Promise.all(sendPromises);

  //   })
  //   .catch((err) => console.error(err))
});


app.use('/.netlify/functions/api/', router);

export const handler = serverless(app);
