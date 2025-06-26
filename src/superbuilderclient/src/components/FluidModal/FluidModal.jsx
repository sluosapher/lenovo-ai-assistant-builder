import React from 'react';
import { Modal, Box, Button, Typography } from '@mui/material';
import './FluidModal.css';
import AssistantLogo from "../assistantLogo/assistantLogo";
import { useTranslation } from 'react-i18next';

const FluidModal = ({ open, handleClose, children, header, assistant, footer }) => {
    const { t } = useTranslation();
    return (
        <Modal
            open={open}
            onClose={handleClose}
            aria-labelledby="modal-title"
            aria-describedby="modal-description"
        >
            <Box className="modal-box">
                <div className="modal-header">
                    <div
                        className="info-logo-fluid"
                        style={{
                            "--logo-container-background-color":
                                assistant.header_bg_color,
                        }}
                    >
                        <AssistantLogo assistant={assistant} />
                    </div>
                    <Typography id="modal-title" variant="h6" component="h2">
                        {header}
                    </Typography>
                </div>
                <div className="modal-body">
                    {children}
                </div>
                <div className="modal-footer">
                    {footer ? (
                        footer
                    ) : (
                        <Button onClick={handleClose} className="close-fluid-button" variant="contained" sx={{ backgroundColor: "#0054ae" }}>
                            {t('fluidmodel.close_button')}
                        </Button>
                    )}
                </div>
            </Box>
            
        </Modal>
    );
};

export default FluidModal;