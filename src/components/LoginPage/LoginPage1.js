import React, { useContext, useRef, useState } from "react";
import "./LoginPage1.scss";
import {
    TextField,
    Button,
    Typography,
    Paper,
    useMediaQuery,
    InputAdornment,
    IconButton,
    Box
} from "@mui/material";
import { fetchLoginApi } from "../../API/LoginAPI/LoginAPI";
import { Eye, EyeOff } from "lucide-react";
import { toast } from "react-hot-toast";
import { useNavigate } from "react-router-dom";
import loginPageLottie from "../../assets/lotties/loginPage.json";
import { emitInternalStoreSocketData, initializeSocket } from "../../socket";
import { LoginContext } from "../../context/LoginData";
import { getToken } from "../../API/GetToken/GetToken";
import Lottie from "lottie-react";

export const commonTextFieldProps = {
    fullWidth: true,
    size: "small",
    className: "textfieldsClass",
};

const LoginPage1 = () => {
    const isMobile = useMediaQuery("(max-width:600px)");
    const [isLoading, setIsLoading] = useState(false);
    const navigate = useNavigate();
    const [isBtnShow, setIsBtnShow] = useState(false);
    const [showPassword, setShowPassword] = useState(false);
    const [credentials, setCredentials] = useState({ companycode: "", userId: "", password: "" });
    const [errors, setErrors] = useState({});
    const [formError, setFormError] = useState("");
    const { setAuth, token, setToken } = useContext(LoginContext);

    const companyCodeRef = useRef(null);
    const userIdRef = useRef(null);
    const passwordRef = useRef(null);

    const handleChange = (e) => {
        const { name, value } = e.target;
        setCredentials({ ...credentials, [name]: value });
        setErrors(prev => ({ ...prev, [name]: "" }));
        if (formError) setFormError("");
    };

    // Add this function inside your component
    const handleCompanyCodeBlur = async () => {
        if (credentials.companycode.trim()) {
            try {
                const token = await getToken(credentials.companycode.trim());
                if (token?.rd?.[0]?.stat === 0) {
                    setErrors(newErrors => ({ ...newErrors, companycode: "Invalid company code" }));
                    setToken({
                        sv: "", // Convert to string if needed
                        yc: "",
                    });
                    sessionStorage.setItem("token", JSON.stringify(token));
                    return false;
                }
                else if (token?.rd?.[0]?.stat === 1) {
                    setIsBtnShow(true)

                    // Fix: Set the token with the correct structure
                    const tokenData = token.rd[0];
                    setToken({
                        sv: tokenData.sv.toString(), // Convert to string if needed
                        yc: tokenData.yc || "",
                    });

                    sessionStorage.setItem("token", JSON.stringify(tokenData));
                    return true;
                }
            } catch (error) {
                console.error("Error in handleCompanyCodeBlur:", error);
                setErrors(prev => ({ ...prev, companycode: "Error validating company code" }));
                return false;
            } finally {
                setIsBtnShow(false);
            }
        }

        return false;
    };

    // Simple validation function
    const validateCredentials = () => {
        const newErrors = {};
        if (!credentials.companycode?.trim()) newErrors.companycode = "Project code is required";
        if (!credentials.userId?.trim()) newErrors.userId = "User ID is required";
        if (!credentials.password?.trim()) newErrors.password = "Password is required";

        setErrors(newErrors);
        return Object.keys(newErrors).length === 0;
    };

    const handleSubmit = async (e) => {
        e?.preventDefault?.();
        setIsLoading(true);
        setFormError("");

        if (!validateCredentials()) {
            setIsLoading(false);
            return;
        }

        if (errors.companycode === "Invalid company code") {
            companyCodeRef.current?.focus?.();
            setIsLoading(false);
            return;
        }

        if (credentials.companycode?.trim() && (!token?.sv || !token?.yc)) {
            const ok = await handleCompanyCodeBlur();
            if (!ok) {
                companyCodeRef.current?.focus?.();
                setIsLoading(false);
                return;
            }
        }

        try {
            const loginData = await fetchLoginApi(credentials);
            console.log("TCL: handleSubmit -> loginData", loginData)

            const userInfo = loginData?.rd?.[0];
            if (userInfo?.stat !== 1) {
                setFormError("Invalid credentials");
                toast.error("Invalid credentials");
                return setIsLoading(false);
            }

            const socket = initializeSocket(userInfo.token)
            const username = [
                userInfo.firstname,
                userInfo.middlename,
                userInfo.lastname
            ]
                .filter(namePart => namePart)
                .join(' ');
            const userData = {
                userId: userInfo.userid,
                username: username,
                ukey: userInfo.ukey,
                token: userInfo.token,
                id: userInfo.id,
                SocketId: userInfo.SocketId || "",
                ufcc: userInfo.companycode ?? ''
            };

            // ✅ Wait for socket to actually connect
            socket.on("connect", async () => {
                const data = {
                    userId: userData.id ?? '',
                    ufcc: userData.ufcc ?? ''
                }
                emitInternalStoreSocketData(data);

                const updatedUserData = { ...userData };
                sessionStorage.setItem("userData", JSON.stringify(updatedUserData));
                sessionStorage.setItem("isLoggedIn", true);
                setAuth(updatedUserData);
                setFormError("");
                toast.success("Login successful! Welcome back!", { icon: "🎉" });
                navigate("/", { replace: true });
                setIsLoading(false);
            });

            // ❌ Handle connection failure
            socket.on("connect_error", (err) => {
                console.error("❌ Socket connect error:", err.message);
                setFormError("Socket connection failed");
                toast.error("Socket connection failed");
                setIsLoading(false);
            });

        } catch (err) {
            console.error("Login error:", err);
            setFormError("Login failed. Please try again.");
            toast.error("Login failed. Please try again.");
            setIsLoading(false);
        }
        finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="login-container">
            <div className="login-wrapper">
                <div className="decorative-circle decorative-circle--top-left"></div>

                <Paper className="login-paper">
                    {/* Left Side: Login Form */}
                    <div className="login-form-section">
                        <div className="login-form-content">
                            <Typography variant="h5" className="login-title">CHAT LOGIN</Typography>
                            <Typography variant="body2" className="login-subtitle" sx={{ mb: formError ? 1 : 2 }}>
                                Welcome back! Let’s get you connected.
                            </Typography>

                            {formError ? (
                                <Typography variant="body2" color="error" sx={{ mb: 1 }}>
                                    {formError}
                                </Typography>
                            ) : null}

                            {/* Project Code */}
                            <div className="form-group">
                                <Typography variant="subtitle1" className="field-label">
                                    Company Code
                                </Typography>
                                <Box
                                    sx={{
                                        position: "relative",
                                        display: "flex",
                                        alignItems: "center",
                                        width: "100%",
                                    }}
                                >
                                    <TextField
                                        name="companycode"
                                        fullWidth
                                        placeholder="Enter project code"
                                        value={credentials.companycode}
                                        onChange={handleChange}
                                        onBlur={handleCompanyCodeBlur}
                                        onKeyDown={async (e) => {
                                            if (e.key !== "Enter") return;
                                            e.preventDefault();

                                            const companyCode = credentials.companycode.trim();
                                            if (!companyCode) {
                                                setErrors(prev => ({ ...prev, companycode: "Project code is required" }));
                                                return;
                                            }

                                            const ok = await handleCompanyCodeBlur();
                                            if (ok) {
                                                userIdRef.current?.focus?.();
                                            }
                                        }}
                                        error={!!errors.companycode}
                                        helperText={errors.companycode}
                                        inputRef={companyCodeRef}
                                        {...commonTextFieldProps}
                                    />

                                    {((token?.sv && token?.yc) && credentials.companycode.trim() !== "") && (
                                        <Box
                                            sx={{
                                                position: "absolute",
                                                right: "-30px",
                                                top: "50%",
                                                transform: "translateY(-50%)",
                                                display: "flex",
                                                alignItems: "center",
                                                pointerEvents: "none",
                                            }}
                                        >
                                            <svg
                                                xmlns="http://www.w3.org/2000/svg"
                                                viewBox="0 0 512 512"
                                                width="22"
                                                height="22"
                                                fill="#00b80c"
                                            >
                                                <path d="M437.016 74.984c-99.979-99.979-262.075-99.979-362.033 0s-99.978 262.073.004 362.031 262.05 99.978 362.029-0.002 99.979-262.075 0-362.029zm-30.168 331.86c-83.318 83.318-218.396 83.318-301.691.004s-83.318-218.377-0.002-301.693 218.375-83.317 301.691 0 83.314 218.372.002 301.689z" />
                                                <path d="M368.911 155.586 234.663 289.834l-70.248-70.248c-8.331-8.331-21.839-8.331-30.17 0s-8.331 21.839 0 30.17l85.333 85.333c8.331 8.331 21.839 8.331 30.17 0l149.333-149.333c8.331-8.331 8.331-21.839 0-30.17s-21.839-8.331-30.17 0z" />
                                            </svg>
                                        </Box>
                                    )}
                                </Box>
                            </div>

                            {/* User ID */}
                            <div className="form-group">
                                <Typography variant="subtitle1" className="field-label">
                                    User Id
                                </Typography>
                                <TextField
                                    name="userId"
                                    fullWidth
                                    placeholder="Enter username"
                                    value={credentials.userId}
                                    onChange={handleChange}
                                    onKeyDown={(e) => {
                                        if (e.key !== "Enter") return;
                                        e.preventDefault();

                                        const userId = credentials.userId.trim();
                                        if (!userId) {
                                            setErrors(prev => ({ ...prev, userId: "User ID is required" }));
                                            return;
                                        }

                                        const password = credentials.password.trim();
                                        if (password) {
                                            handleSubmit();
                                            return;
                                        }

                                        passwordRef.current?.focus?.();
                                    }}
                                    error={!!errors.userId}
                                    helperText={errors.userId}
                                    inputRef={userIdRef}
                                    {...commonTextFieldProps}
                                />
                            </div>

                            {/* Password */}
                            <div className="form-group">
                                <Typography variant="subtitle1" className="field-label">
                                    Password
                                </Typography>
                                <TextField
                                    name="password"
                                    fullWidth
                                    placeholder="Enter password"
                                    type={showPassword ? "text" : "password"}
                                    value={credentials.password}
                                    onChange={handleChange}
                                    onKeyDown={(e) => {
                                        if (e.key === "Enter") {
                                            e.preventDefault();
                                            handleSubmit();
                                        }
                                    }}
                                    error={!!errors.password}
                                    helperText={errors.password}
                                    inputRef={passwordRef}
                                    {...commonTextFieldProps}
                                    InputProps={{
                                        endAdornment: (
                                            <InputAdornment position="end">
                                                <IconButton
                                                    onClick={() => setShowPassword(!showPassword)}
                                                    onKeyDown={(e) => {
                                                        if (e.key === "Enter" || e.key === " ") {
                                                            e.preventDefault();
                                                            setShowPassword((prev) => !prev);
                                                        }
                                                    }}
                                                    aria-label={showPassword ? "Hide password" : "Show password"}
                                                    tabIndex={0}
                                                    className="password-toggle"
                                                >
                                                    {showPassword ? <EyeOff width={20} height={20} /> : <Eye width={20} height={20} />}
                                                </IconButton>
                                            </InputAdornment>
                                        )
                                    }}
                                />
                            </div>


                            <div className="login-button-container">
                                <Button
                                    variant="contained"
                                    className="buttonClassname login-button"
                                    onClick={handleSubmit}
                                    disabled={isLoading}
                                >
                                    {isLoading ? 'Logging...' : 'Login Now'}
                                </Button>
                            </div>

                        </div>
                    </div>

                    {/* Right Side: Image */}
                    {!isMobile && (
                        <div className="login-image-section">
                            <div className="image-container">
                                {/* <img
                                    src={"./loginImage.webp"}
                                    alt="Login Visual"
                                    className="login-image"
                                /> */}
                                <Lottie
                                    animationData={loginPageLottie}
                                    loop={true}
                                    className="login-image"
                                />
                            </div>
                        </div>
                    )}
                </Paper>

                <div className="decorative-circle decorative-circle--bottom-right"></div>
            </div>
        </div>
    );
};

export default LoginPage1;
