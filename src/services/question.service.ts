import { Injectable } from '@angular/core';
import { AngularFireDatabase } from 'angularfire2/database';
import { ToastController } from 'ionic-angular';
/*import { Observable } from '@firebase/util';
import { getPromise } from '@ionic-native/core';
import { Observable } from 'rxjs/Observable';
import { PositioningPage } from '../pages/positioning/positioning';*/
import { Subscription } from 'rxjs';
import { tap, map } from 'rxjs/operators';
declare var cordova: any;

export class Creator {
  name: string;
  colour: string;
  checked: boolean;
}

export class Poi {
  identifier: string;
  buildingIdentifier: string;
  question: string;
  answer: string;
  cartesianCoordinate: {
    x: string;
    y: string;
  };
  coordinate: {
    latitude: string;
    longitude: string;
  };
  floorIdentifier: string;
  poiName: string;
  position: {
    buildingIdentifier: string;
    cartesianCoordinate: {
      x: string;
      y: string;
    };
    coordinate: {
      latitude: string;
      longitude: string;
    };
    floorIdentifier: string;
    isIndoor: string;
    isOutdoor: string;
  };
  isIndoor: string;
  isOutdoor: string;
  category: string;
  colour: string;
  creator: string;
  infoHtml: string;
  customFields: {};
  hasQRCode: boolean;
  QRCodeID: string;
  workspaceId: string;
  base64: string;
  asociatedTrigger: string;
  visible: boolean;
}

@Injectable()
export class QuestionService {
  poisTraidos: any[];
  tabla = 'questions/';
  public subscription: Subscription;

  constructor(
    public angularfirebaseDB: AngularFireDatabase,
    public toastCtrl: ToastController
  ) {}

  public updateQuestion(anEditedPoi, idWorkspace) {
    return new Promise<boolean>((resPromesa) => {
      this.angularfirebaseDB.database
        .ref(
          this.tabla +
            idWorkspace +
            '/' +
            anEditedPoi.creator +
            '/' +
            anEditedPoi.identifier +
            '/'
        )
        .set(anEditedPoi)
        .then(
          (resolve) => {
            resPromesa(true);
          },
          (reject) => {
            resPromesa(false);
          }
        );
    });
  }

  public getQuestions(workspaceId, currentFloor, pagina, loading, trigger) {
    if (this.subscription) {
      this.subscription.unsubscribe();
      // pagina.destroyAllMarkers();
    }

    let changeFloor = true;
    if (loading) {
      pagina.hideLoading(loading);
    }
    return new Promise<Poi[]>((resPromesa) => {
      //EL LISTENER DE FIREBASE EJECUTA DESDE EL SUBSCRIBE
      this.subscription = this.angularfirebaseDB
        .list('questions/' + workspaceId + '/' + currentFloor.floorIdentifier)
        .valueChanges()
        .subscribe(
          (pois) => {
            if (loading) {
              //FUNCIONA PARA CUANDO CAMBIO DE PISO CREO
              pagina.hideLoading(loading);
            }
          },
          (error) => {
            const errorMsg = 'Un error ha ocurrido al recuperar las preguntas';
            console.log(`${errorMsg}`, error);
          }
        );
    });
  }

  public getAllQuestions(workspaceId: number) {
    return this.angularfirebaseDB
      .list('questions/' + workspaceId)
      .valueChanges()
      .pipe(
        map((response) =>
          response.reduce((a: any[], b) => {
            const elementsb = Object.keys(b).map((k) => {
              const element = b[k];
              return element;
            });
            return [...a, ...elementsb];
          }, [])
        )
      );
  }

  public saveQuestion(workspaceId, aPoi) {
    return new Promise<boolean>((result) => {
      aPoi.workspaceId = workspaceId; //PONGO EL ID DEL WORKSPACE EN EL POI
      this.angularfirebaseDB.database
        .ref(
          this.tabla +
            workspaceId +
            '/' +
            aPoi.creator +
            '/' + //CAMBIOS ACA
            aPoi.identifier
        )
        .set(aPoi)
        .then(
          (resolve) => {
            result(true);
          },
          (reject) => {
            result(false);
          }
        );
    });
  }

  public deleteQuestion(aPoi) {
    return new Promise<boolean>((result) => {
      this.angularfirebaseDB.database
        .ref(
          'questions/' +
            aPoi.workspaceId +
            '/' +
            aPoi.creator +
            '/' +
            aPoi.identifier
        )
        .set(null)
        .then(
          (resolve) => {
            result(true);
          },
          (reject) => {
            result(false);
          }
        );
    });
  }
}
