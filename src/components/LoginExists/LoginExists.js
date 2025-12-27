import { useContext, useState } from "react";
import { useNavigate } from "react-router-dom";
import { LoginContext } from "../../context/LoginData";
import "./LoginExists.scss";
import warning from "../../assets/lotties/warning.json";
import loader from "../../assets/lotties/loader.json";
import Lottie from "lottie-react";
import { LogoutApi } from "../../API/Logout/Logout";
import { savePlayerId } from "../../API/SavePlayerId/SavePlayerId";
import { initializeSocket } from "../../socket";
import { Button } from "@mui/material";

const LoginExists = () => {
    const { setAuth } = useContext(LoginContext);
    const [loading, setLoading] = useState(false);
    const getId = JSON.parse(sessionStorage.getItem("hasSocketId"));
    const navigate = useNavigate();

    const handleStayLoggedIn = async () => {
        try {
            setLoading(true);
            await LogoutApi(getId?.id);
            const socket = initializeSocket(getId?.token);

            setAuth({
                userId: getId?.userId,
                username: getId?.username,
                ukey: getId?.ukey,
                token: getId?.token,
                id: getId?.id,
                whatsappKey: getId?.whatsappKey,
                whatsappNumber: getId?.whatsappNumber,
                SocketId: socket?.id || "",
            });

            sessionStorage.setItem("isLoggedIn", true);
            sessionStorage.setItem("userData", JSON.stringify(getId));
            await savePlayerId(socket?.id, getId?.userId, getId?.id);
            sessionStorage.removeItem("hasSocketId");

            navigate("/");
        } catch (error) {
            console.error("Error staying logged in:", error);
        } finally {
            setLoading(false);
        }
    };

    const handleLogout = async () => {
        try {
            setLoading(true);
            sessionStorage.clear();
            navigate("/login");
        } catch (error) {
            console.error("Error logging out:", error);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="session-wrapper">
            {/* Loader Overlay */}
            {loading && (
                <div className="loader-overlay">
                    <div className="lottie-container">
                        <Lottie
                            animationData={loader}
                            loop={true}
                            style={{ width: "100%", height: "100%", pointerEvents: "none" }}
                        />
                    </div>
                </div>
            )}

            <div className="session-right">
                <div className="session-card">
                    <div className="logo">
                        <Lottie
                            animationData={warning}
                            loop={true}
                            style={{ width: "50%", height: "50%", pointerEvents: "none" }}
                        />
                    </div>
                    <div className="message">
                        You are already logged in on another device.
                    </div>
                    <div className="buttons">
                        <Button
                            className="btn stay"
                            onClick={handleLogout}
                            disabled={loading}
                        >
                            Stay Logged In
                        </Button>
                        <Button
                            className="btn logout"
                            onClick={handleStayLoggedIn}
                            disabled={loading}
                        >
                            Logout other sessions
                        </Button>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default LoginExists;
