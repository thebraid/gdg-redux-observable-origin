import { createStore, applyMiddleware } from 'redux'
import { composeWithDevTools } from 'redux-devtools-extension';
import { defaultStore, rootReducer } from './reducer';
import { combineEpics, createEpicMiddleware } from "redux-observable";
import { epics } from "./epics";
import { getData, getDataWithError } from "./helpers";
import {ajax} from 'rxjs/ajax';

const epicMiddleware = createEpicMiddleware({
    dependencies: {
        getData,
        getDataWithError,
        ajax
    }
});

export const store = createStore(
    rootReducer,
    defaultStore,
    composeWithDevTools(
        applyMiddleware(epicMiddleware),
    )
);

epicMiddleware.run(combineEpics(...epics));
