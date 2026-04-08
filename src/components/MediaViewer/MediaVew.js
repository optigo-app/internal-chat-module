import React, { useState, useMemo, useRef, useEffect } from "react";
import {
  Modal,
  Box,
  IconButton,
  Stack,
  Typography,
  Fade,
  Chip,
  Button
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
import { handleDownloadFile } from "../../utils/globalFunc";

/* ─── Tokens ───────────────────── */

const T = {
  bg: "#f7f8fb",
  surface: "#ffffff",
  border: "rgba(0,0,0,0.08)",
  accent: "#5b6cff",
  text: "#1f2937",
  muted: "rgba(31,41,55,0.55)",
  radius: "12px",
  toolbar: 84,
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
        boxShadow: "0 6px 18px rgba(0,0,0,0.15)",
        border: "1px solid rgba(0,0,0,0.05)",
        transition: "all .2s",
        "&:hover": {
          bgcolor: "#fff",
          transform: "translateY(-50%) scale(1.05)"
        }
      }}
    >
      <Icon size={18} />
    </Box>
  );
};

/* ─── Thumbnail Strip ───────────────── */
const ThumbnailStrip = ({ items, activeIdx, onSelect }) => {
  const [swiper, setSwiper] = useState(null);
  useEffect(() => {
    if (swiper && !swiper.destroyed) {
      swiper.slideTo(activeIdx);
    }
  }, [activeIdx, swiper]);

  return (
    <Box
      sx={{
        height: T.thumbH,
        bgcolor: "#f6f7fb",
        boxShadow: "inset 0 1px 0 rgba(0,0,0,0.03)",
        px: 2,
        display: "flex",
        alignItems: "center"
      }}
    >
      <Swiper
        slidesPerView={"auto"}
        spaceBetween={8}
        onSwiper={setSwiper}
        initialSlide={activeIdx}
        slideToClickedSlide={true}
        watchSlidesProgress={true}
        centeredSlides={true}
      >
        {items.map((item, idx) => {
          const type = getType(item);
          const active = idx === activeIdx;

          return (
            <SwiperSlide key={idx} style={{ width: 64 }}>
              <Box
                onClick={() => onSelect(idx)}
                sx={{
                  width: 60,
                  height: 60,
                  margin: "2px 0px",
                  borderRadius: "10px",
                  overflow: "hidden",
                  border: active
                    ? `2px solid ${T.accent}`
                    : "1px solid rgba(0,0,0,0.08)",
                  cursor: "pointer",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  bgcolor: "#fff",
                  position: "relative",
                  transition: "all .2s ease",
                  "&:hover": {
                    transform: "scale(1.05)"
                  }
                }}
              >
                {/* IMAGE */}
                {type === "image" && (
                  <img
                    src={item.src || item.FileUrl}
                    style={{
                      width: "100%",
                      height: "100%",
                      objectFit: "cover"
                    }}
                    alt=""
                  />
                )}

                {/* VIDEO */}
                {type === "video" && (
                  <>
                    <video
                      src={(item.src || item.FileUrl) + "#t=0.5"}
                      muted
                      preload="metadata"
                      playsInline
                      style={{
                        width: "100%",
                        height: "100%",
                        objectFit: "cover",
                        pointerEvents: "none"
                      }}
                    />

                    {/* Play overlay */}
                    <Box
                      sx={{
                        position: "absolute",
                        inset: 0,
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        bgcolor: "rgba(0,0,0,0.25)"
                      }}
                    >
                      <Video size={16} color="#fff" />
                    </Box>
                  </>
                )}

                {/* DOCUMENT */}
                {type === "document" && (
                  <>
                    <TypeIcon type={type} size={20} />

                    <Box
                      sx={{
                        position: "absolute",
                        bottom: 2,
                        right: 2,
                        bgcolor: "rgba(0,0,0,0.6)",
                        color: "#fff",
                        fontSize: 9,
                        px: 0.5,
                        borderRadius: "3px"
                      }}
                    >
                      DOC
                    </Box>
                  </>
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
        alignItems: "center",
        justifyContent: "space-between"
      }}
    >
      <Stack direction="row" spacing={2} alignItems="center" sx={{ flex: 1 }}>
        <Box
          sx={{
            width: 34,
            height: 34,
            borderRadius: "8px",
            bgcolor: "#f1f3f7",
            display: "flex",
            alignItems: "center",
            justifyContent: "center"
          }}
        >
          <TypeIcon type={type} size={16} />
        </Box>

        <Box sx={{ minWidth: 0 }}>
          <Typography
            sx={{
              fontWeight: 600,
              fontSize: 13,
              color: T.text,
              whiteSpace: "nowrap",
              overflow: "hidden",
              textOverflow: "ellipsis",
              maxWidth: 420
            }}
          >
            {name}
          </Typography>

          <Typography sx={{ fontSize: 11, color: T.muted }}>
            {activeIdx + 1} of {totalCount}
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
          <IconButton onClick={() => handleDownloadFile(item.FileUrl)}>
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
    <Box
      sx={{
        display: "flex",
        justifyContent: "center",
        alignItems: "center",
        width: "100%",
        height: "70vh"
      }}
    >
      <Box
        sx={{
          width: 340,
          p: 4,
          borderRadius: "14px",
          bgcolor: "#fff",
          border: `1px solid ${T.border}`,
          boxShadow: "0 12px 40px rgba(0,0,0,0.12)",
          textAlign: "center"
        }}
      >
        <Box
          sx={{
            width: 70,
            height: 70,
            borderRadius: "12px",
            bgcolor: "#f1f3f7",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            margin: "0 auto",
            mb: 2
          }}
        >
          <FileText size={34} />
        </Box>

        <Typography
          sx={{
            fontWeight: 600,
            fontSize: 14,
            mb: 1,
            wordBreak: "break-word"
          }}
        >
          {item.FileName || "Document"}
        </Typography>

        <Typography
          sx={{
            fontSize: 12,
            color: T.muted,
            mb: 3
          }}
        >
          {item.MimeType || "File"}
        </Typography>

        <Stack direction="row" spacing={2} justifyContent="center">
          <Button
            variant="outlined"
            size="small"
            startIcon={<FileText size={16} />}
            onClick={() => window.open(item.FileUrl, "_blank")}
            className="secondaryBtnClassname"
          >
            Open
          </Button>
          <Button
            variant="contained"
            size="small"
            startIcon={<Download size={16} />}
            onClick={() => handleDownloadFile(item.FileUrl, item.FileName)}
            className="primaryBtnClassname"
          >
            Download
          </Button>
        </Stack>
      </Box>
    </Box>
  );
};

/* ─── MAIN COMPONENT ───────────────── */

const MediaModal = ({ open, handleClose, mediaItems, initialIndex = 0 }) => {
  const [zoom, setZoom] = useState(1);
  const [activeIdx, setActiveIdx] = useState(initialIndex);
  const [isFullscreen, setIsFullscreen] = useState(false);

  const swiperRef = useRef(null);

  const allMedia = useMemo(() => {
    return [
      ...(mediaItems?.images || []),
      ...(mediaItems?.videos || []),
      ...(mediaItems?.documents || [])
    ];
  }, [mediaItems]);

  useEffect(() => {
    if (open) {
      setActiveIdx(initialIndex);
      if (swiperRef.current) {
        swiperRef.current.slideTo(initialIndex, 0);
      }
    }
  }, [open, initialIndex]);

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
              initialSlide={initialIndex}
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