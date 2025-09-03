﻿import React from "react";
import SimpleAccordion from "../accordion/SimpleAccordion";
import { Typography, Card } from "@mui/material";
import MemoryIcon from '@mui/icons-material/Memory';  // for CPU
import SdCardIcon from '@mui/icons-material/SdCard';  // for RAM
import VideogameAssetIcon from '@mui/icons-material/VideogameAsset';  // for GPU/NPU

import useDataStore from "../../stores/DataStore";
import { useTranslation } from 'react-i18next';

export const SystemInfoCard = () => {
    const { t } = useTranslation();
    const sysInfo = useDataStore((state) => state.system_info);

    const getSystemValue = (type) => {
        if (sysInfo) {
            switch (type) {
                case "cpu_name":
                    return `${sysInfo.CPUInfo.Name}`;
                case "cpu_core":
                    return `${sysInfo.CPUInfo.NumberOfCores} Cores`;
                case "cpu_lcore":
                    return `${sysInfo.CPUInfo.NumberOfLogicCores} Logic Cores`;
                case "ram":
                    return `${sysInfo.MemoryInfo.CapacityInGB}GB`;
                case "ram_freq":
                    return `${sysInfo.MemoryInfo.FreqInMHz}Mhz`;
                case "gpu_name":
                    return `${sysInfo.GpuInfo.Name}`;
                case "gpu_drv":
                    return `${sysInfo.GpuInfo.DriverVersion}`;
                case "gpu_mem":
                    return `${sysInfo.GpuInfo.MemoryInGB}GB Memory`;
                case "npu_name":
                    return `${sysInfo.NpuInfo.Name}`;
                case "npu_version":
                    return `${sysInfo.NpuInfo.version}`;
                case "npu_id":
                    return ''; // hide for now
                default:
                    return '';
            }
        }
    };

    return (
        <SimpleAccordion
            title={t('setting.systeminfo.title')}
            description={t('setting.systeminfo.description')}
        >
            <SystemInfoItem
                icon="cpu"
                title="CPU"
                values={[
                    getSystemValue("cpu_name"),
                    getSystemValue("cpu_core"),
                    getSystemValue("cpu_lcore"),
                ]}
            />
            <SystemInfoItem
                icon="memory-card"
                title="RAM"
                values={[
                    getSystemValue("ram"),
                    getSystemValue("ram_freq"),
                ]}
            />
            <SystemInfoItem
                icon="gpu"
                title="GPU"
                values={[
                    getSystemValue("gpu_name"),
                    getSystemValue("gpu_drv"),
                    getSystemValue("gpu_mem"),
                ]}
            />
            <SystemInfoItem
                icon="gpu"
                title="NPU"
                values={[
                    getSystemValue("npu_name"),
                    getSystemValue("npu_version"),
                    getSystemValue("npu_id"),
                ]}
            />
        </SimpleAccordion>
    )

};

const SystemInfoItem = ({ icon, title, values }) => {
    // Helper function to get the correct icon component
    const getIcon = (iconName) => {
        switch (iconName) {
            case 'cpu':
                return <MemoryIcon className="system-icon" />;
            case 'memory-card':
                return <SdCardIcon className="system-icon" />;
            case 'gpu':
                return <VideogameAssetIcon className="system-icon" />;
            default:
                return <MemoryIcon className="system-icon" />;
        }
    };

    return (
        <Card orientation="vertical" className="system-info-card">
            <div className="system-div">
                <div className="system-type">
                    {getIcon(icon)}
                    <Typography>{title}</Typography>
                </div>
                <div className="system-value">
                    {values.map((value, index) => (
                        <React.Fragment key={index}>
                            <Typography variant="body2" className={`${title}-${index}`}>
                                <strong>{value && value.includes("null") ? "" : value}</strong>
                            </Typography>
                            {title === "CPU" && index === 0 && <br />}
                            {title === "GPU" && index === 1 && <br />}
                            {title === "NPU" && (index === 0 || index === 1) && <br />}
                        </React.Fragment>
                    ))}
                </div>
            </div>
        </Card>
    );
};
