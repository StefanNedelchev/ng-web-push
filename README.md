# NgPushExample

This project was generated with [Angular CLI](https://github.com/angular/angular-cli) version 17.1.0.

## Demo

The app has been deployed via Netlify [here](https://ng-web-push-example.netlify.app/). The push service has been implemented via Netlify function and subscriptions are kept in memory so keep in mind that you will lose all subscriptions when the function is destroyed (which happens in a few minutes after last activity). If such thing happens simply unsubscribe and subscribe again.

## Development server

Run `ng serve` for a dev server. Navigate to `http://localhost:4200/`. The application will automatically reload if you change any of the source files.

## Code scaffolding

Run `ng generate component component-name` to generate a new component. You can also use `ng generate directive|pipe|service|class|guard|interface|enum|module`.

## Build

Run `ng build` to build the project. The build artifacts will be stored in the `dist/` directory.

## Running unit tests

Run `ng test` to execute the unit tests via [Karma](https://karma-runner.github.io).

## Running end-to-end tests

Run `ng e2e` to execute the end-to-end tests via a platform of your choice. To use this command, you need to first add a package that implements end-to-end testing capabilities.

## Further help

To get more help on the Angular CLI use `ng help` or go check out the [Angular CLI Overview and Command Reference](https://angular.io/cli) page.
