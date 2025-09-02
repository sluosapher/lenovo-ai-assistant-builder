import { createContext, useState } from 'react';

const AppStatusContext = createContext({
 closing: false,
 setClosing: () => {},
 isAppReady: true,
 setIsAppReady: () => {},
});

const AppStatusProvider = ({ children }) => {
 const [closing, setClosing] = useState();
 const [isAppReady, setIsAppReady] = useState(true);

 return (
   <AppStatusContext.Provider value={{ closing, setClosing, isAppReady, setIsAppReady }}>
     {children}
   </AppStatusContext.Provider>
 );
};

export { AppStatusContext, AppStatusProvider };