import { ofType } from "redux-observable";
import {
    of,
    from,
    forkJoin,
    timer,
    EMPTY
} from "rxjs";
import {
    map,
    switchMap,
    catchError,
    takeUntil,
    delay,
    retryWhen,
    scan,
    delayWhen
} from "rxjs/operators";

import { awaitLogin } from "./helpers";


// Эпик выполняет событие "FIRST_SUCCESS" сразу после события "FIRST"
export const firstEpic = (action$) => {
    return action$.pipe(
        ofType('FIRST'),
        map((action) => {
            return {type: 'FIRST_SUCCESS', action}
        })
    );
};


// Эпик дожидается результата промиса и тригерит событие "SECOND_SUCCESS" с данными из запроса
export const secondEpic = (action$, store$, { getData }) => {
    return action$.pipe(
        ofType('SECOND'),
        switchMap(() => from(getData(1000, 5)).pipe(
            // Управление в map произойдет после того, как будут получены данные из функции getData (функция возвращающая Promise)
            map(value => ({type: 'SECOND_SUCCESS', value}))
        ))
    )
};


// Обработка ошибки в запросе
export const thirdEpic = (action$, store$, { getDataWithError }) => {
    return action$.pipe(
        ofType('THIRD'),
        switchMap(() => from(getDataWithError(1000)).pipe(
            catchError(() => of({type: 'THIRD_ERROR'})) // тригерит 1 событие при ошибке
        )),
    );
};


// Эпик тригерит 2 события при ошибке
export const thirdEpic_2 = (action$, store$, { getDataWithError }) => {
    return action$.pipe(
        ofType('THIRD_2'),
        switchMap(() => from(getDataWithError(1000)).pipe(
            catchError(() => from([{type: 'THIRD_ERROR_1'}, {type: 'THIRD_ERROR_2'}]))
        )),
    );
};


// Эпик возвращаем EMPTY если не нужно делать ни каких действий при ошибке
export const thirdEpic_3 = (action$, store$, { getDataWithError }) => {
    return action$.pipe(
        ofType('THIRD_3'),
        switchMap(() => from(getDataWithError(1000)).pipe(
            catchError(() => EMPTY) // оператор EMPTY является синтаксическим сахаром записи: new Observable(observer => observer.complete())
        )),
    );
};


// Получение значение из хранилища redux
export const fourthEpic = (action$, store$, { getData }) => {
    return action$.pipe(
        ofType('FOURTH'),
        switchMap(() => {
            const state = store$.value;

            // используем в запросе данные из Redux хранилища
            return from(getData(1000, state)).pipe(
                map(value => ({type: 'FOURTH_SECCUSS', value})),
                catchError(() => of({type: 'FOURTH_ERROR'}))
            )
        }),
    )
};


// Два последовательных запроса
export const fifthEpic = (action$, store$, { getData }) => {
    return action$.pipe(
        ofType('FIFTH'),
        switchMap(() => from(getData(2000, 1)).pipe( // первый запрос
            // result1 - результат первого запроса
            switchMap((result1) => from(getData(1000, result1 + 2))), // второй запрос
            // result2 - результат второго запроса
            map(result2 => ({type: 'FIFTH_SUCCESS', value: result2})),
            catchError(() => of({type: 'FIFTH_ERROR'}))
        )),
    )
};


// Два параллельных запроса
export const sixthEpic = (action$, store$, { getData }) => {
    return action$.pipe(
        ofType('SIXTH'),
        switchMap(() => {
            return forkJoin(
                from(getData(2000, 1)), // первый запрос
                from(getData(1000, 2)), // второй запрос
            ).pipe(
                // порядок результатов распологается в порядке вызова, первый запрос - result1, второй запрос - result2
                map(([result1, result2]) => {
                    return {type: 'SIXTH_SUCCESS', result1, result2}
                }),
                catchError(() => of({type: 'SIXTH_ERROR'}))
            )
        }),
    )
};


/*
  Два последовательных запроса (№1 и №2) и один запрос (№3) параллельный им

 |
 |\
 1 |
 | 3
 2 |
 |/
 |

*/
export const seventhEpic = (action$, store$, { getData }) => {
    return action$.pipe(
        ofType('SEVENTH'),
        switchMap(() => {
            return forkJoin(
                from(getData(2000, 1)).pipe( // Первый запрос
                    // Получаем данные "result1" из первого запроса, но в дальнейшем не используем эти данные во втором запросе
                    switchMap((result1) => from(getData(1000, 2))) // Второй запрос
                ),
                from(getData(1000, 3)), // Третий запрос, происходящий параллельно первому и второму
            ).pipe(
                // Получаем результат второго запроса и третьего
                map(([result2, result3]) => {
                    return {type: 'SEVENTH_SUCCESS', result2, result3}
                }),
                catchError(() => of({type: 'SEVENTH_ERROR'}))
            )
        }),

    )
};


// Эпик тригерит каждую секунду событие "EIGHTH_TICK" после события "EIGHTH". При наступлении события "EIGHTH_STOP" прекращает тригерить события.
export const eighthEpic = (action$) => {
    return action$.pipe(
        ofType('EIGHTH'),
        switchMap(() => timer(0, 1000).pipe(
            takeUntil(action$.pipe(
                ofType('EIGHTH_STOP')
            )),
            map(() => ({type: 'EIGHTH_TICK'}))
        ))
    )
};


// Дожидаемся, пока изменится значение флага в store и делаем запрос за данными
const ninthEpic = (action$, store$, { getData }) => {
    return action$.pipe(
        ofType('NINTH'),

        // // Оператор audit приостанавливает эпик до тех пор, пока указанное в нем событие не произойдет.
        // // В данном случае эпик будет будет ожидать пока не появится поле "login" в Redux хранилище.
        // // Такой подход полезен, когда нам в запросе нужно использовать данные из хранилища, которые могут быть еще не загружены.

        // audit(() => {
        //     return store$.pipe(
        //         filter((data) => {
        //             return data.login;
        //         })
        //     )
        // }),

        // вынесли блок с audit в отдельный оператор
        awaitLogin(store$),

        switchMap(() => from(getData(1000, 1)).pipe(
            map(() => ({type: 'NINTH_DONE'})),
            catchError(() => of({type: 'NINTH_ERROR'}))
        )),
    );
};



const RETRY_COUNT = 2;

// Повтор при ошибке (exponential backoff), вариант через ajax
export const tenthEpic = (action$, store$, { ajax }) => {
    return action$.pipe(
        ofType('TENTH'),
        switchMap(() => ajax('https://asdfasdfsdf.ru').pipe( // делаем запрос к несуществующему url
            retryWhen((errors$) => {
                return errors$.pipe(
                    // Данный scan накапливает информацию о том, сколько раз произошла ошибка.
                    // Если кол-во ошибок <= RETRY_COUNT, то кол-во произошедших ошибок передается в оператор delayWhen.
                    // Если кол-во ошибок больше RETRY_COUNT то выбрасывается исключение и управление попадает в оператор catchError
                    scan((acc) => {
                        acc = acc + 1;

                        //
                        if (acc > RETRY_COUNT) {
                            throw new Error('error');
                        }

                        return acc;
                    }, 0),
                    // Когда оператор delayWhen вернет событие - это будет сигналом к тому, чтобы повторить запрос за данными.
                    // Так как кол-во попыток === 2 (RETRY_COUNT) то в оператор delayWhen после первой ошибки попадет значение 1,
                    // то последующий запрос сработает через 1 секунду (1 * 1000).
                    // Когда произойдет еще одна ошибка, повтор повториться через 2 секунды (2 * 1000)
                    delayWhen((acc) => {
                        return timer( acc * 1000)
                    })
                )
            }),
            map(() => {
                return {type: 'TENTH_SUCCESS'}
            }),
            catchError(() => {
                return of({type: 'TENTH_ERROR'})
            })
        ))
    )
};


// Повтор при ошибке (exponential backoff), вариант через from
export const tenthEpic_2 = (action$, store$, { getDataWithError }) => {
    // счетчик, показывающий текущую попытку выполнить запрос
    let currentRetryCount = 0;

    return action$.pipe(
        ofType('TENTH_2'),
        switchMap((action) => from(getDataWithError(1000)).pipe(
            map(() => {
                // Важно сбросить текущее кол-во попыток в 0, чтобы при последующем вызове эпика не остались данные предыдущего эпика.
                currentRetryCount = 0;
                return {type: 'TENTH_2_SUCCESS'};
            }),
            catchError(() => {
                currentRetryCount++;

                if (currentRetryCount <= RETRY_COUNT) {
                    // Если произошла ошибка, вручную перезапускаем эпик сгенериров изначальное событие с задержкой, которое пришло в эпик.
                    // Вновь сгенерированная ошибка снова попадет в этот эпик. Значение "currentRetryCount" сохраняется между вызовами эпика.
                    return of(action).pipe(
                        delay(currentRetryCount * 1000),
                    );
                }

                // Важно сбросить текущее кол-во попыток в 0, чтобы при последующем вызове эпика не остались данные предыдущего эпика.
                currentRetryCount = 0;
                return of({type: 'TENTH_2_ERROR'})
            })
        )),

    )
};


export const epics = [
    firstEpic,
    secondEpic,
    thirdEpic,
    thirdEpic_2,
    thirdEpic_3,
    fourthEpic,
    fifthEpic,
    sixthEpic,
    seventhEpic,
    eighthEpic,
    ninthEpic,
    tenthEpic,
    tenthEpic_2,
];
