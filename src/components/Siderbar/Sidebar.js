import { useContext, useEffect, useState } from 'react'
import './Sidebar.scss'
import { HomeIcon, Users, ChevronLeft } from 'lucide-react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { LoginContext } from '../../context/LoginData'
import CryptoJS from "crypto-js";
import { IconButton, Tooltip } from '@mui/material'
import logo from "../../assets/logo.png"

const Sidebar = ({ isCollapsed = false, onCollapsedChange = () => { } }) => {

    const location = useLocation();
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
            return encodeURIComponent(ciphertext);
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
        // { type: "internal", path: "/add-conversation", icon: <Users {...ICON_PROPS} />, label: "Add Conversation" },
    ];

    useEffect(() => {
        setActivePath(location.pathname);
    }, [location.pathname]);

    const handleHeaderClick = () => {
        if (isCollapsed) {
            onCollapsedChange(false);
        }
        navigate("/");
    };

    return (
        <div
            className={`sidebar_mainDiv ${isCollapsed ? 'collapsed' : ''}`}
            style={{ width: isCollapsed ? 76 : 260, minWidth: isCollapsed ? 76 : 260 }}
        >
            <div className="sidebar-content">
                <div className="sidebar-sections">
                    <div className="agentic-chat-header">
                        <div className="agentic-chat-header__icon" onClick={handleHeaderClick}>
                            <div className="icon-bg">
                                <img src={logo} alt="TeCoChat" className="icon" loading="lazy" />
                            </div>
                            {!isCollapsed && <h1 className="title">TeCoChat</h1>}
                        </div>

                        {!isCollapsed && (
                            // <Tooltip title="Collapse sidebar" placement="right" arrow>
                            <IconButton
                                className="sidebar-toggle"
                                size="small"
                                onClick={(e) => {
                                    e.stopPropagation();
                                    onCollapsedChange(!isCollapsed);
                                }}
                            >
                                <ChevronLeft size={18} />
                            </IconButton>
                            // </Tooltip>
                        )}
                    </div>
                    <div className="sidebar_main">
                        <ul>
                            {menuItems.map((item) => {
                                const isExternal = item.type === "external";
                                const isActive = activePath === item.path ||
                                    (activePath === "/archieve" && item.path === "/");

                                let content = (
                                    <>
                                        <div className="sidebar-item-icon">
                                            {item.icon}
                                        </div>
                                        <span>{item.label}</span>
                                    </>
                                );

                                return (
                                    <li key={item.label}>
                                        {/* <Tooltip
                                            title={item.label}
                                            placement="right"
                                            arrow
                                            disableHoverListener={!isCollapsed}
                                        > */}
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
                                                className={`sidebar_main_link ${isActive ? "active" : ""}`}
                                            >
                                                {content}
                                            </Link>
                                        )}
                                        {/* </Tooltip> */}
                                    </li>
                                );
                            })}
                        </ul>
                    </div>
                </div>

                {/* Powered by section at the bottom */}
                <div className={isCollapsed ? "powered-by collapsed" : "powered-by"}>
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
