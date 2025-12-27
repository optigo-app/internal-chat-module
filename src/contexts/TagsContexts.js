import { createContext, useContext, useState } from "react";

const TagsContext = createContext();

export const useTagsContext = () => useContext(TagsContext);

export const TagsProvider = ({ children }) => {
    const [tags, setTags] = useState([]);
    const [refetchTrigger, setRefetchTrigger] = useState(0);

    const addTags = (tag) => {
        setTags([...tags, tag]);
    };

    const removeTags = (tag) => {
        setTags(tags.filter(t => t.id !== tag.id));
    };

    const triggerRefetch = () => {
        setRefetchTrigger(prev => prev + 1); 
    };

    return (
        <TagsContext.Provider
            value={{
                tags,
                addTags,
                removeTags,
                refetchTrigger,
                triggerRefetch
            }}
        >
            {children}
        </TagsContext.Provider>
    );
};
