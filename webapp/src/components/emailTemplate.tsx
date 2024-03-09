import * as React from "react";
import { Img } from "@react-email/img";

interface EmailTemplateProps {
  url: string;
  message: string;
}

export const EmailTemplate: React.FC<Readonly<EmailTemplateProps>> = ({
  url,
  message,
}) => (
  <div>
    <h1>Hello! Your cat just jumped on your table again:</h1>
    <p>{message}</p>
    <Img src={url} alt="Cat" />
  </div>
);
