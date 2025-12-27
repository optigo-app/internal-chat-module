import './Header.scss'
import ProfileAvatar from '../ProfileAvatar/ProfileAvatar'

const Header = () => {
    return (
        <div className="header_mainDiv">
            <div className="header_main">
                <div className="header_left">
                    <div className="header_brand">
                        <img src="./logo.png" alt="logo" className="header_left_logo" />
                    </div>
                </div>
                <div className="header_right">
                    <ProfileAvatar />
                </div>
            </div>
        </div>
    )
}

export default Header
