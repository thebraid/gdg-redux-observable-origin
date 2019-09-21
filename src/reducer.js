export const defaultStore = {
    test: 1,
    login: undefined
};

export const rootReducer = (state = defaultStore, action) => {
    switch (action.type) {
        case 'CHANGE_LOGIN':
            return {
                ...state,
                login: action.login
            };
        default:
            return state
    }
};
