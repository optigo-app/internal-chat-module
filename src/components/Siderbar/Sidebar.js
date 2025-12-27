import { useContext, useEffect, useState } from 'react'
import './Sidebar.scss'
import { HomeIcon, Users, Megaphone, MessageCircle, Workflow } from 'lucide-react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { useTagsContext } from '../../contexts/TagsContexts'
import { fetchAllTagsApi } from '../../API/FetchTags/FetchAllTagsApi'
import { LoginContext } from '../../context/LoginData'
import CryptoJS from "crypto-js";

const Sidebar = ({ onStatusSelect, selectedStatus, onTagSelect, selectedTag }) => {

    const location = useLocation();
    const [allTagLists, setAllTagsLists] = useState([]);
    const { refetchTrigger } = useTagsContext();
    const [activePath, setActivePath] = useState(location.pathname);
    const { auth } = useContext(LoginContext);
    const navigate = useNavigate();
    const token = JSON.parse(sessionStorage.getItem("token"));
    const Token = {
        ...token, userId: auth?.userId, id: auth?.id, username: auth?.username
    }

    const urls = {
        broadcast: {
            local: "http://localhost:3000",
            live: "https://wababroadcast.optigoapps.com",
            SECRET_KEY: "chat-broadcast-config"
        },
        automation: {
            local: "http://localhost:3000",
            live: "https://zen1.optigoapps.com",
            SECRET_KEY: "chat-automation-config"
        },
    };

    const isLocal = process.env.NODE_ENV === "development";

    const broadcastURL = urls.broadcast[isLocal ? "local" : "live"];
    const automationURL = urls.automation[isLocal ? "local" : "live"];

    const broadcast_SECRET_KEY = urls.broadcast.SECRET_KEY;
    const automation_SECRET_KEY = urls.automation.SECRET_KEY;

    const encryptToken = (token, page) => {
        if (!token) return "";
        try {
            const ciphertext = CryptoJS.AES.encrypt(JSON.stringify(token), page === "broadcast" ? broadcast_SECRET_KEY : automation_SECRET_KEY).toString();
            return encodeURIComponent(ciphertext); // safe for URL
        } catch (error) {
            console.error('Error encrypting token:', error);
            return "";
        }
    };

    const appURLs = {
        broadcast: broadcastURL,
        automation: automationURL,
    };

    const ICON_PROPS = { size: 20, strokeWidth: 2 };

    const menuItems = [
        { type: "internal", path: "/", icon: <HomeIcon {...ICON_PROPS} />, label: "Inbox" },
        { type: "internal", path: "/add-conversation", icon: <Users {...ICON_PROPS} />, label: "Add Conversation" },
    ];

    const handleTagsClick = (tag) => {
        if (selectedTag === tag) {
            onTagSelect('All');
        } else {
            onTagSelect(tag);
        }
    };

    const handleFetchAllTags = async () => {
        try {
            const response = await fetchAllTagsApi(auth?.userId);
            if (response?.rd) {
                setAllTagsLists(response.rd);
            }
        } catch (error) {
            console.error('Error fetching all tags:', error);
        }
    };

    useEffect(() => {
        if (auth?.token) {
            handleFetchAllTags();
        }
    }, [refetchTrigger]);

    useEffect(() => {
        setActivePath(location.pathname);
    }, [location.pathname]);

    return (
        <div className="sidebar_mainDiv">
            <div className="sidebar-content">
                <div className="sidebar-sections">
                    <div className="agentic-chat-header" onClick={() => navigate("/")}>
                        <div className="agentic-chat-header__icon">
                            <div className="icon-bg">
                                <MessageCircle className="icon" {...ICON_PROPS} />
                            </div>
                            <h1 className="title">Internal chat</h1>
                        </div>
                    </div>
                    <div className="sidebar_main">
                        <ul>
                            {menuItems.map((item) => {
                                const isExternal = item.type === "external";
                                const isActive = activePath === item.path ||
                                    (activePath === "/archieve" && item.path === "/");

                                let content = (
                                    <>
                                        {item.icon}
                                        <span>{item.label}</span>
                                    </>
                                );

                                return (
                                    <li key={item.label}>
                                        {isExternal ? (
                                            <a
                                                href={`${appURLs[item.app]}?token=${encryptToken(Token, item.app)}`}
                                                target="_blank"
                                                rel="noopener noreferrer"
                                            >
                                                {content}
                                            </a>
                                        ) : (
                                            <Link
                                                to={item.path}
                                                onClick={() => setActivePath(item.path)}
                                                className={isActive ? "active" : ""}
                                            >
                                                {content}
                                            </Link>
                                        )}
                                    </li>
                                );
                            })}
                        </ul>
                    </div>

                    {allTagLists?.length > 0 &&
                        <div className="sidebar_main_tags">
                            <div className="sidebar_tags_label">Tags</div>
                            <ul>
                                {allTagLists.map((tag) => {
                                    return (
                                        <li
                                            key={tag.TagId}
                                            className={selectedTag?.Id === tag.Id ? 'active' : ''}
                                            onClick={() => handleTagsClick(tag)}
                                        >
                                            <div className="tag-chip">
                                                <span
                                                    className="tag-dot"
                                                    style={{ backgroundColor: tag.color || '#e0f2f1' }}
                                                />
                                                <span className="tag-name">{tag.TagName}</span>
                                            </div>
                                        </li>
                                    )
                                })}
                            </ul>
                        </div>
                    }
                </div>

                {/* Powered by section at the bottom */}
                <div className="powered-by">
                    <span>Powered by </span>
                    <div className="optigo-logo">
                        <img src="/logo1.png" alt="Optigo logo" />
                    </div>
                </div>
            </div>
        </div>
    );
};

export default Sidebar
