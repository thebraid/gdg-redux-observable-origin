import {Observable, of} from "rxjs";
import { toArray } from "rxjs/operators";
import { firstEpic, secondEpic, thirdEpic_2 } from "./epics";

describe('redux-observable', () => {
    it('Первый тест', async () => {
        const action$ = of({type: 'FIRST'});
        const expectActionType = 'FIRST_SUCCESS';

        const resultEpic = await firstEpic(action$).toPromise(); // resultEpic === {type: 'FIRST_SUCCESS'}
        expect(resultEpic.type).toEqual(expectActionType);
    });

    it('Второй тест', async () => {
        const action$ = of({type: 'SECOND'});
        const expectActionType = 'SECOND_SUCCESS';
        const dependencies = {
            getData: () => Promise.resolve(1)
        };

        const resultEpic = await secondEpic(action$, null, dependencies).toPromise(); // resultEpic === {type: 'SECOND_SUCCESS'}

        expect(resultEpic.type).toEqual(expectActionType);
    });


    it('Третий тест', async () => {
        const action$ = of({type: 'THIRD_2'});
        const expectActionType = [ {type: 'THIRD_ERROR_1'}, {type: 'THIRD_ERROR_2'} ];
        const dependencies = {
            getData: () => Promise.reject(1)
        };

        const resultEpic = await thirdEpic_2(action$, null, dependencies).pipe(
            toArray()
        ).toPromise(); // resultEpic === [ {type: 'THIRD_ERROR_1'}, {type: 'THIRD_ERROR_2'} ]

        expect(resultEpic).toEqual(expectActionType);
    })
});
