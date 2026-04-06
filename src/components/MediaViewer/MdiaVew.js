import React, { useState, useMemo, useRef, useEffect } from "react";
import {
  Modal,
  Box,
  IconButton,
  Stack,
  Typography,
  Fade,
  Chip
} from "@mui/material";

import {
  X,
  Maximize,
  Minimize,
  ChevronLeft,
  ChevronRight,
  Download,
  Image,
  Video,
  FileText,
  ZoomIn,
  ZoomOut
} from "lucide-react";
import './MediaViewer.scss';

import { Swiper, SwiperSlide } from "swiper/react";
import { Navigation, Keyboard, A11y } from "swiper/modules";

import "swiper/css";
import "swiper/css/navigation";

/* ─── Tokens ───────────────────── */

const T = {
  bg: "#f7f8fb",
  surface: "#ffffff",
  border: "rgba(0,0,0,0.08)",
  accent: "#5b6cff",
  text: "#1f2937",
  muted: "rgba(31,41,55,0.55)",
  radius: "12px",
  toolbar: 72,
  thumbH: 84
};

/* ─── Helpers ─────────────────── */

const getType = (item) => {
  const m = item?.MimeType || item?.type || "";
  if (m.includes("image")) return "image";
  if (m.includes("video")) return "video";
  return "document";
};

const TypeIcon = ({ type, size = 16 }) => {
  const icons = {
    image: Image,
    video: Video,
    document: FileText
  };
  const Icon = icons[type] || FileText;
  return <Icon size={size} />;
};

/* ─── Custom Navigation Button ───────────────── */

const NavBtn = ({ dir, className }) => {
  const Icon = dir === "prev" ? ChevronLeft : ChevronRight;

  return (
    <Box
      className={className}
      sx={{
        position: "absolute",
        top: "50%",
        transform: "translateY(-50%)",
        zIndex: 10,
        cursor: "pointer",
        bgcolor: "#fff",
        borderRadius: "50%",
        width: 40,
        height: 40,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        boxShadow: "0 4px 10px rgba(0,0,0,0.15)",
        "&:hover": {
          bgcolor: "#f5f5f5"
        }
      }}
    >
      <Icon size={18} />
    </Box>
  );
};

/* ─── Thumbnail Strip ───────────────── */

const ThumbnailStrip = ({ items, activeIdx, onSelect }) => {
  const thumbSwiper = useRef(null);

  useEffect(() => {
    if (thumbSwiper.current) {
      thumbSwiper.current.slideTo(activeIdx);
    }
  }, [activeIdx]);

  return (
    <Box
      sx={{
        height: T.thumbH,
        borderTop: `1px solid ${T.border}`,
        bgcolor: "#f1f3f7",
        px: 2,
        display: "flex",
        alignItems: "center"
      }}
    >
      <Swiper
        slidesPerView={"auto"}
        spaceBetween={8}
        onSwiper={(s) => (thumbSwiper.current = s)}
      >
        {items.map((item, idx) => {
          const type = getType(item);
          const active = idx === activeIdx;

          return (
            <SwiperSlide key={idx} style={{ width: 60 }}>
              <Box
                onClick={() => onSelect(idx)}
                sx={{
                  width: 56,
                  height: 56,
                  borderRadius: "8px",
                  overflow: "hidden",
                  border: active
                    ? `2px solid ${T.accent}`
                    : "2px solid transparent",
                  cursor: "pointer",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  bgcolor: "#fff"
                }}
              >
                {type === "image" ? (
                  <img
                    src={item.src || item.FileUrl}
                    style={{
                      width: "100%",
                      height: "100%",
                      objectFit: "cover"
                    }}
                    alt=""
                  />
                ) : (
                  <TypeIcon type={type} size={22} />
                )}
              </Box>
            </SwiperSlide>
          );
        })}
      </Swiper>
    </Box>
  );
};

/* ─── Toolbar ───────────────── */

const Toolbar_ = ({
  item,
  totalCount,
  activeIdx,
  zoom,
  onZoom,
  onReset,
  isFullscreen,
  onFullscreen,
  onClose
}) => {
  const type = item ? getType(item) : null;
  const name = item?.FileName || "Media";

  return (
    <Box
      sx={{
        height: T.toolbar,
        borderBottom: `1px solid ${T.border}`,
        bgcolor: T.surface,
        px: 3,
        display: "flex",
        alignItems: "center"
      }}
    >
      <Stack direction="row" spacing={1} sx={{ flex: 1 }}>
        <TypeIcon type={type} size={18} />

        <Box>
          <Typography sx={{ fontWeight: 600, fontSize: 13 }}>
            {name}
          </Typography>

          <Typography sx={{ fontSize: 11, color: T.muted }}>
            {activeIdx + 1} / {totalCount}
          </Typography>
        </Box>
      </Stack>

      {type === "image" && (
        <Stack direction="row" spacing={1} alignItems="center">
          <IconButton onClick={() => onZoom(-0.25)}>
            <ZoomOut size={16} />
          </IconButton>

          <Typography
            sx={{ fontSize: 12, cursor: "pointer" }}
            onClick={onReset}
          >
            {Math.round(zoom * 100)}%
          </Typography>

          <IconButton onClick={() => onZoom(0.25)}>
            <ZoomIn size={16} />
          </IconButton>
        </Stack>
      )}

      <Stack direction="row" spacing={1} sx={{ ml: 2 }}>
        {item?.FileUrl && (
          <IconButton component="a" href={item.FileUrl} download>
            <Download size={16} />
          </IconButton>
        )}

        <IconButton onClick={onFullscreen}>
          {isFullscreen ? <Minimize size={16} /> : <Maximize size={16} />}
        </IconButton>

        <IconButton onClick={onClose}>
          <X size={16} />
        </IconButton>
      </Stack>
    </Box>
  );
};

/* ─── Slide Content ───────────────── */

const SlideContent = ({ item, zoom }) => {
  const type = getType(item);

  if (type === "image")
    return (
      <Box
        sx={{
          transform: `scale(${zoom})`,
          transition: "0.25s",
          pt: 3
        }}
      >
        <img
          src={item.src || item.FileUrl}
          style={{
            maxHeight: "75vh",
            maxWidth: "90vw",
            objectFit: "contain"
          }}
          alt=""
        />
      </Box>
    );

  if (type === "video")
    return (
      <video
        controls
        style={{
          maxHeight: "75vh",
          maxWidth: "90vw"
        }}
        src={item.src || item.FileUrl}
      />
    );

  return (
    <Box textAlign="center">
      <FileText size={40} />
      <Typography>{item.FileName}</Typography>
      <Chip label={item.MimeType} />
    </Box>
  );
};

/* ─── MAIN COMPONENT ───────────────── */

const MediaModal = ({ open, handleClose, mediaItems }) => {
  const [zoom, setZoom] = useState(1);
  const [activeIdx, setActiveIdx] = useState(0);
  const [isFullscreen, setIsFullscreen] = useState(false);

  const swiperRef = useRef(null);

  const allMedia = useMemo(() => {
    return [
      ...(mediaItems?.images || []),
      ...(mediaItems?.videos || []),
      ...(mediaItems?.documents || [])
    ];
  }, [mediaItems]);

  const handleZoom = (delta) => {
    setZoom((z) => Math.min(Math.max(z + delta, 1), 4));
  };

  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen();
      setIsFullscreen(true);
    } else {
      document.exitFullscreen();
      setIsFullscreen(false);
    }
  };

  const handleThumbSelect = (idx) => {
    swiperRef.current.slideTo(idx);
    setActiveIdx(idx);
  };

  const currentItem = allMedia[activeIdx];

  return (
    <Modal open={open} onClose={handleClose}>
      <Fade in={open}>
        <Box
          sx={{
            width: "100vw",
            height: "100vh",
            bgcolor: T.bg,
            display: "flex",
            flexDirection: "column"
          }}
        >
          <Toolbar_
            item={currentItem}
            totalCount={allMedia.length}
            activeIdx={activeIdx}
            zoom={zoom}
            onZoom={handleZoom}
            onReset={() => setZoom(1)}
            isFullscreen={isFullscreen}
            onFullscreen={toggleFullscreen}
            onClose={handleClose}
          />

          {/* SLIDER */}

          <Box
            sx={{
              flex: 1,
              pt: 4,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              position: "relative"
            }}
          >
            <NavBtn dir="prev" className="nav-prev" />
            <NavBtn dir="next" className="nav-next" />

            <Swiper
              modules={[Navigation, Keyboard, A11y]}
              navigation={{
                nextEl: ".nav-next",
                prevEl: ".nav-prev"
              }}
              keyboard
              onSwiper={(s) => (swiperRef.current = s)}
              onSlideChange={(s) => {
                setZoom(1);
                setActiveIdx(s.activeIndex);
              }}
            >
              {allMedia.map((item, idx) => (
                <SwiperSlide key={idx}>
                  <Box
                    sx={{
                      display: "flex",
                      justifyContent: "center"
                    }}
                  >
                    <SlideContent item={item} zoom={zoom} />
                  </Box>
                </SwiperSlide>
              ))}
            </Swiper>
          </Box>

          {allMedia.length > 1 && (
            <ThumbnailStrip
              items={allMedia}
              activeIdx={activeIdx}
              onSelect={handleThumbSelect}
            />
          )}
        </Box>
      </Fade>
    </Modal>
  );
};

export default MediaModal;