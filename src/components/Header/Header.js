import './Header.scss'
import ProfileAvatar from '../ProfileAvatar/ProfileAvatar'
import { Rocket } from 'lucide-react'
import { emitAppVersionUpdate } from '../../socket'
import { getAppVersion } from '../../utils/versionManager'
import toast from 'react-hot-toast'

const Header = () => {
    const handleVersionTest = () => {
        const ok = emitAppVersionUpdate({ source: 'manual-test' });
        toast(ok ? `Emitted app_version_update (v${getAppVersion()})` : 'Socket not connected', { duration: 2000 });
    };

    return (
        <div className="header_mainDiv">
            <div className="header_main">
                <div className="header_left">
                    <div className="header_brand">
                        <img src="./icons/logo.png" alt="logo" className="header_left_logo" loading='lazy' draggable="false" />
                    </div>
                </div>
                <div className="header_right">
                    <button
                        type="button"
                        className="header-version-test-btn"
                        onClick={handleVersionTest}
                        title="Test app version socket"
                    >
                        <Rocket size={18} />
                    </button>
                    <ProfileAvatar />
                </div>
            </div>
        </div>
    )
}

export default Header
