import { audit, filter } from "rxjs/operators";

// Возвращает промис, который будет успешно выполнен через "delay" миллсекунд с указанными нами данными "result"
export const getData = (delay, result) => {
    return new Promise((resolve) => {
        setTimeout(
            () => {
                console.log('resolve: ', result);
                resolve(result)
            },
            delay
        )
    })
};

// Возращает промис, который завершится ошибкой через "delay" миллсекунд
export const getDataWithError = (delay) => {
    return new Promise((resolve, reject) => {
        setTimeout(() => {
            console.log('reject');
            reject('reject');
        }, delay)
    })
};

// Пользовательский оператор для эпиков. Дожидается заполненного поля "login" в Redux хранилище и пропускает выполнение дальше.
export const awaitLogin = (store$) => audit(() => {
    return store$.pipe(
        filter((data) => {
            return data.login;
        })
    )
});
