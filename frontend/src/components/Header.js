import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import "./Header.css";
import Chat from "../pages/Chat";
import Profile from "../pages/Profile";

// 아이콘 컴포넌트들
const LayoutIcon = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect>
    <line x1="3" y1="9" x2="21" y2="9"></line>
    <line x1="9" y1="21" x2="9" y2="9"></line>
  </svg>
);

const SearchIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <circle cx="11" cy="11" r="8"></circle>
    <path d="m21 21-4.35-4.35"></path>
  </svg>
);

const BellIcon = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"></path>
    <path d="M13.73 21a2 2 0 0 1-3.46 0"></path>
  </svg>
);

const PlusIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <line x1="12" y1="5" x2="12" y2="19"></line>
    <line x1="5" y1="12" x2="19" y2="12"></line>
  </svg>
);

const CalendarIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect>
    <line x1="16" y1="2" x2="16" y2="6"></line>
    <line x1="8" y1="2" x2="8" y2="6"></line>
    <line x1="3" y1="10" x2="21" y2="10"></line>
  </svg>
);

const MessageIcon = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"></path>
  </svg>
);

const TeamIcon = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path>
    <circle cx="9" cy="7" r="4"></circle>
    <path d="M23 21v-2a4 4 0 0 0-3-3.87"></path>
    <path d="M16 3.13a4 4 0 0 1 0 7.75"></path>
  </svg>
);

const ChevronDownIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <polyline points="6 9 12 15 18 9"></polyline>
  </svg>
);

function Header({ nameInitials, currentDateTime }) {
  const navigate = useNavigate();
  const [userId, setUserId] = useState(null);
  const [userName, setUserName] = useState("");
  const [profileImage, setProfileImage] = useState(null);
  const [myProjects, setMyProjects] = useState([]);
  const [showMyProjects, setShowMyProjects] = useState(false);
  const [isChatOpen, setIsChatOpen] = useState(false);
  const [isProfileOpen, setIsProfileOpen] = useState(false);
  const [isSearchFocused, setIsSearchFocused] = useState(false);
  const [hasNotifications, setHasNotifications] = useState(true);
  const [showUserMenu, setShowUserMenu] = useState(false);

  // 로그인된 사용자 정보 가져오기
  useEffect(() => {
    fetch("http://127.0.0.1:8000/api/users/profile/", {
      method: "GET",
      credentials: "include",
    })
      .then((res) => res.json())
      .then((data) => {
        if (data.user_id) {
          setUserId(parseInt(data.user_id));
          setUserName(data.name || "사용자");
          
          // 프로필 이미지 경로 처리
          if (data.profile_image) {
            const imageUrl = data.profile_image.startsWith('http') 
              ? data.profile_image 
              : `http://127.0.0.1:8000${data.profile_image}`;
            setProfileImage(imageUrl);
          }
        }
      })
      .catch((err) =>
        console.error("🚨 사용자 정보를 불러오지 못했습니다.", err)
      );
  }, []);

  // 사용자 ID가 있으면 해당 사용자의 프로젝트 목록 가져오기
  useEffect(() => {
    if (!userId) return;
    fetch(`http://127.0.0.1:8000/chat/api/user/${userId}/projects/`, {
      method: "GET",
      credentials: "include",
    })
      .then((res) => res.json())
      .then((data) => {
        if (data.projects) {
          setMyProjects(data.projects);
        } else if (data.error) {
          console.log(data.error);
        }
      })
      .catch((err) => {
        console.error("🚨 프로젝트 목록을 불러오지 못했습니다.", err);
      });
  }, [userId]);

  // 특정 프로젝트 클릭 시
  const handleProjectClick = (projectId) => {
    fetch("http://127.0.0.1:8000/api/users/projects/set/", {
      method: "POST",
      credentials: "include",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: new URLSearchParams({
        project_id: projectId,
      }),
    })
      .then((res) => res.json())
      .then((data) => {
        console.log(data.message);
        navigate(`/project/${projectId}/task`);
      })
      .catch((err) => console.error("Error setting project ID:", err));
  };

  return (
    <header className="Header_header">
      <div className="Header_left">
        <div className="Header_logo-area" onClick={() => navigate("/main")}>
          <div className="Header_logo-icon">
            <img src="/testlogo.png" alt="InfLoop 로고" />
          </div>
          <h1 className="Header_logo-text">InfLoop</h1>
        </div>
        
        <nav className="Header_nav">
          <ul>
            <li className="Header_nav-item" onClick={() => navigate("/create-project")}>
              <PlusIcon />
              <span>새 프로젝트</span>
            </li>

            {/* 내 프로젝트 드롭다운 */}
            <li className="Header_dropdown">
              <div
                className="dropdown-container"
                onMouseEnter={() => setShowMyProjects(true)}
                onMouseLeave={() => setShowMyProjects(false)}
              >
                <div className="Header_nav-item">
                  <LayoutIcon />
                  <span>내 프로젝트</span>
                </div>
                {showMyProjects && (
                  <ul className="Header_dropdown-content">
                    {myProjects.length > 0 ? (
                      myProjects.map((project) => (
                        <li
                          key={project.project_id}
                          onClick={() => handleProjectClick(project.project_id)}
                        >
                          {project.project_name}
                        </li>
                      ))
                    ) : (
                      <li className="no-projects">프로젝트가 없습니다.</li>
                    )}
                  </ul>
                )}
              </div>
            </li>

            <li className="Header_nav-item" onClick={() => navigate("/calendar")}>
              <CalendarIcon />
              <span>캘린더</span>
            </li>
            
            <li className="Header_nav-item" onClick={() => navigate("/team-finder")}>
              <TeamIcon />
              <span>팀구하기</span>
            </li>
          </ul>
        </nav>
      </div>

      <div className="Header_right">
        {/* 현재 시간 표시 */}
        <span className="Header_current-time">
          {currentDateTime?.toLocaleDateString('ko-KR', { month: 'long', day: 'numeric' })} {' '}
          {currentDateTime?.toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit' })}
        </span>

        {/* 검색창 */}
        <div className="Header_search-container">
          <div className={`Header_search-box ${isSearchFocused ? "focused" : ""}`}>
            <SearchIcon />
            <input
              type="text"
              className="Header_search-input"
              placeholder="검색..."
              onFocus={() => setIsSearchFocused(true)}
              onBlur={() => setIsSearchFocused(false)}
            />
          </div>
        </div>

        {/* 알림 버튼 */}
        <button className="Header_notification-btn" onClick={() => setHasNotifications(false)}>
          <BellIcon />
          {hasNotifications && <span className="Header_notification-dot"></span>}
        </button>

        {/* 채팅 버튼 */}
        <button className="Header_icon-btn" onClick={() => setIsChatOpen(true)}>
          <MessageIcon />
        </button>
        {isChatOpen && <Chat onClose={() => setIsChatOpen(false)} />}

        {/* 프로필 영역 (사진 + 이름 + 드롭다운) */}
        <div 
          className="Header_user-section"
          onMouseEnter={() => setShowUserMenu(true)}
          onMouseLeave={() => setShowUserMenu(false)}
        >
          <div className="Header_user-info" onClick={() => setIsProfileOpen(true)}>
            {profileImage ? (
              <img 
                src={profileImage} 
                alt="프로필" 
                className="Header_user-avatar-img"
                onError={(e) => {
                  e.target.style.display = "none";
                  e.target.nextSibling.style.display = "flex";
                }}
              />
            ) : null}
            <div 
              className="Header_user-avatar" 
              style={{ display: profileImage ? "none" : "flex" }}
            >
              <span>{nameInitials}</span>
            </div>
            <div className="Header_user-details">
              <span className="Header_user-name">{userName}</span>
              <span className="Header_user-role">멤버</span>
            </div>
            <ChevronDownIcon />
          </div>
          
          {/* 드롭다운 메뉴 */}
          {showUserMenu && (
            <div className="Header_user-menu">
              <div className="Header_user-menu-item" onClick={() => setIsProfileOpen(true)}>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path>
                  <circle cx="12" cy="7" r="4"></circle>
                </svg>
                <span>프로필 설정</span>
              </div>
              <div className="Header_user-menu-divider"></div>
              <div className="Header_user-menu-item logout" onClick={() => {
                // 로그아웃 로직
                navigate("/login");
              }}>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"></path>
                  <polyline points="16 17 21 12 16 7"></polyline>
                  <line x1="21" y1="12" x2="9" y2="12"></line>
                </svg>
                <span>로그아웃</span>
              </div>
            </div>
          )}
        </div>
        {isProfileOpen && <Profile onClose={() => setIsProfileOpen(false)} />}
      </div>
    </header>
  );
}

export default Header;