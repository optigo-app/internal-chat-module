import { createContext, useContext, useState } from "react";

const ArchieveContext = createContext();

export const useArchieveContext = () => useContext(ArchieveContext);

export const ArchieveProvider = ({ children }) => {
    const [archieve, setArchieve] = useState(null);

    const addArchieve = (arch) => {
        setArchieve(arch);
    };

    return (
        <ArchieveContext.Provider
            value={{
                archieve,
                addArchieve,
            }}
        >
            {children}
        </ArchieveContext.Provider>
    );
};
