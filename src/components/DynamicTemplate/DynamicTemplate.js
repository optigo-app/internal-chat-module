import { useState, useEffect } from 'react';
import axios from 'axios';
import './DynamicTemplate.scss';
import { Skeleton } from '@mui/material';

const API_BASE_URL = 'https://crmapp.mpillarapi.com/api/meta/v19.0/769593252737288';

const DynamicTemplate = ({
    templateName = 'album',
    params = {},
    language = 'en',
    components = []
}) => {
    const [templateData, setTemplateData] = useState(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);

    useEffect(() => {
        const fetchTemplate = async () => {
            if (templateName) {
                setLoading(true);
                try {
                    const response = await axios.get(
                        `${API_BASE_URL}/message_templates?name=${templateName}`,
                        {
                            headers: {
                                'Content-Type': 'application/json',
                                'Authorization': 'Bearer HCtiBj7qarnyrvlOYaOicsPNuSYRDhtaoTSIahd9WJnWJmUnorBgE0h99w34dDVQ0jZIUtjvCRbGBc8AEC5Rwt9QR6nKqjsaseDQaOTQKm60lOO6HM5sTxgj2j8'
                                // Add any required authentication headers here
                            }
                        }
                    );

                    if (response.data?.data?.length > 0) {
                        setTemplateData(response.data.data[0]);
                    } else {
                        setError('Template not found');
                    }
                } catch (err) {
                    console.error('Error fetching template:', err);
                    setError('Failed to load template');
                } finally {
                    setLoading(false);
                }
            }
        };

        fetchTemplate();
    }, [templateName]);

    const renderTemplateComponent = (component) => {
        if (!component) return null;

        switch (component.type) {
            case 'BODY':
                let bodyText = component.text || '';
                // Replace placeholders with params
                Object.entries(params).forEach(([key, value], index) => {
                    const placeholder = new RegExp(`\\{\\{\\s*${index + 1}\\s*\\}\\}`, 'g');
                    bodyText = bodyText.replace(placeholder, value || '');
                });

                return (
                    <div className="template-body">
                        {bodyText.split('\n').map((line, i) => (
                            <p key={i}>{line}</p>
                        ))}
                    </div>
                );

            case 'FOOTER':
                return (
                    <div className="template-footer">
                        {component.text}
                    </div>
                );

            // Add more component types (HEADER, BUTTONS, etc.) as needed

            default:
                return null;
        }
    };

    if (loading) {
        return <div className="loading">
            <Skeleton
                variant="rounded"
                className="media-skeleton"
                sx={{
                    width: "350px",
                    height: "220px",
                }}
            />
        </div>;
    }

    if (error) {
        return <div className="error">{error}</div>;
    }

    if (!templateData) {
        return null;
    }

    return (
        <div className="whatsapp-template">
            {templateData.components?.map((component, index) => (
                <div key={`${component.type}-${index}`}>
                    {renderTemplateComponent(component)}
                </div>
            ))}
        </div>
    );
};

export default DynamicTemplate;