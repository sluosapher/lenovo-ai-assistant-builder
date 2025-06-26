import { createContext, useState } from 'react';

const AppStatusContext = createContext({
 closing: false,
 setClosing: () => {},
});

const AppStatusProvider = ({ children }) => {
 const [closing, setClosing] = useState();

 return (
   <AppStatusContext.Provider value={{ closing, setClosing }}>
     {children}
   </AppStatusContext.Provider>
 );
};

export { AppStatusContext, AppStatusProvider };