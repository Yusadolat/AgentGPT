import React, { useEffect, useRef } from "react";
import { useTranslation } from "next-i18next";
import { type GetStaticProps, type NextPage } from "next";
import Badge from "../components/Badge";
import DefaultLayout from "../layout/default";
import ChatWindow from "../components/console/ChatWindow";
import Drawer from "../components/Drawer";
import Input from "../components/Input";
import Button from "../components/Button";
import { FaStar } from "react-icons/fa";
import PopIn from "../components/motions/popin";
import AutonomousAgent from "../components/AutonomousAgent";
import Expand from "../components/motions/expand";
import HelpDialog from "../components/HelpDialog";
import { SettingsDialog } from "../components/SettingsDialog";
import { useAuth } from "../hooks/useAuth";
import type { AgentMode, Message } from "../types/agentTypes";
import { AUTOMATIC_MODE, isTask, PAUSE_MODE } from "../types/agentTypes";
import { useAgent } from "../hooks/useAgent";
import { isEmptyOrBlank } from "../utils/whitespace";
import { resetAllMessageSlices, useAgentStore, useMessageStore } from "../stores";
import { serverSideTranslations } from "next-i18next/serverSideTranslations";
import { useSettings } from "../hooks/useSettings";
import { findLanguage, languages } from "../utils/languages";
import nextI18NextConfig from "../../next-i18next.config.js";
import { SorryDialog } from "../components/SorryDialog";
import { SignInDialog } from "../components/SignInDialog";
import { env } from "../env/client.mjs";
import { MediaControls } from "../components/console/MediaControls";

const Home: NextPage = () => {
  const { i18n } = useTranslation();

  const addMessage = useMessageStore.use.addMessage();
  const messages = useMessageStore.use.messages();
  const updateTaskStatus = useMessageStore.use.updateTaskStatus();

  const setAgent = useAgentStore.use.setAgent();
  const agent = useAgentStore.use.agent();

  const { session, status } = useAuth();
  const [nameInput, setNameInput] = React.useState<string>("FIX ME");
  const [goalInput, setGoalInput] = React.useState<string>("");
  const [mobileVisibleWindow, setMobileVisibleWindow] = React.useState<"Chat" | "Tasks">("Chat");
  const settingsModel = useSettings();

  const [showHelpDialog, setShowHelpDialog] = React.useState(false);
  const [showSettingsDialog, setShowSettingsDialog] = React.useState(false);
  const [showSorryDialog, setShowSorryDialog] = React.useState(false);
  const [showSignInDialog, setShowSignInDialog] = React.useState(false);
  const [hasSaved, setHasSaved] = React.useState(false);
  const agentUtils = useAgent();

  useEffect(() => {
    const key = "agentgpt-modal-opened-v0.2";
    const savedModalData = localStorage.getItem(key);

    setTimeout(() => {
      if (savedModalData == null) {
        setShowHelpDialog(true);
      }
    }, 1800);

    localStorage.setItem(key, JSON.stringify(true));
  }, []);

  const nameInputRef = useRef<HTMLInputElement>(null);
  useEffect(() => {
    nameInputRef?.current?.focus();
  }, []);

  const setAgentRun = (newName: string, newGoal: string) => {
    if (agent != null) {
      return;
    }

    setNameInput(newName);
    setGoalInput(newGoal);
    handleNewGoal(newName, newGoal);
  };

  const handleAddMessage = (message: Message) => {
    if (isTask(message)) {
      updateTaskStatus(message);
    }

    addMessage(message);
  };

  const handlePause = () => {
    agentUtils.setStatus("paused");
  };

  const disableDeployAgent =
    agent != null || isEmptyOrBlank(nameInput) || isEmptyOrBlank(goalInput);

  const handleNewGoal = (name: string, goal: string) => {
    if (name.trim() === "" || goal.trim() === "") {
      return;
    }

    // Do not force login locally for people that don't have auth setup
    if (session === null && env.NEXT_PUBLIC_FORCE_AUTH) {
      setShowSignInDialog(true);
      return;
    }

    agentUtils.setRunningMode(AUTOMATIC_MODE);
    const newAgent = new AutonomousAgent(
      name.trim(),
      goal.trim(),
      findLanguage(i18n.language).name,
      settingsModel.settings,
      agentUtils.runningMode,
      {
        onMessage: handleAddMessage,
        onPause: handlePause,
        onShutdown: () => {
          agentUtils.setStatus("stopped");
        },
        onStart: () => {
          agentUtils.setStatus("running");
        },
      }
    );
    setAgent(newAgent);
    setHasSaved(false);
    resetAllMessageSlices();

    newAgent?.run().then(console.log).catch(console.error);
  };

  const handleContinue = (mode: AgentMode = "Automatic Mode") => {
    if (!agent || agentUtils.status === "stopped") {
      handleNewGoal(nameInput, goalInput);
      return;
    }

    agentUtils.setRunningMode(mode);
    agent.mode = mode;
    agent.run().then(console.log).catch(console.error);
  };

  const handleKeyPress = (
    e: React.KeyboardEvent<HTMLInputElement> | React.KeyboardEvent<HTMLTextAreaElement>
  ) => {
    // Only Enter is pressed, execute the function
    if (e.key === "Enter" && !disableDeployAgent && !e.shiftKey) {
      if (agentUtils.status === "paused") {
        handleContinue();
      }
      handleNewGoal(nameInput, goalInput);
    }
  };
  const shouldShowSave =
    status === "authenticated" && agentUtils.status === "stopped" && messages.length && !hasSaved;

  return (
    <DefaultLayout>
      <HelpDialog show={showHelpDialog} close={() => setShowHelpDialog(false)} />
      <SettingsDialog
        customSettings={settingsModel}
        show={showSettingsDialog}
        close={() => setShowSettingsDialog(false)}
      />
      <SorryDialog show={showSorryDialog} close={() => setShowSorryDialog(false)} />
      <SignInDialog show={showSignInDialog} close={() => setShowSignInDialog(false)} />
      <main className="flex min-h-screen flex-row">
        <Drawer
          showHelp={() => setShowHelpDialog(true)}
          showSettings={() => setShowSettingsDialog(true)}
        />
        <div
          id="content"
          className="z-10 flex min-h-screen w-full items-center justify-center p-2 sm:px-4 md:px-10"
        >
          <div
            id="layout"
            className="flex h-full w-full max-w-screen-xl flex-col items-center justify-between gap-1 py-2 sm:gap-3 sm:py-5 md:justify-center"
          >
            <div id="title" className="relative flex flex-col items-center font-mono">
              <div className="flex flex-row items-start shadow-2xl">
                <span className="text-4xl font-bold text-[#C0C0C0] xs:text-5xl sm:text-6xl">
                  Agent
                </span>
                <span className="text-4xl font-bold text-white xs:text-5xl sm:text-6xl">GPT</span>
                <PopIn delay={0.5}>
                  <Badge>
                    {`${i18n?.t("BETA", {
                      ns: "indexPage",
                    })}`}{" "}
                    🚀
                  </Badge>
                </PopIn>
              </div>
              <div className="mt-1 text-center font-mono text-[0.7em] font-bold text-white">
                <p>
                  {i18n.t("HEADING_DESCRIPTION", {
                    ns: "indexPage",
                  })}
                </p>
              </div>
            </div>

            <Expand className="flex max-h-[60vh] w-full flex-grow flex-row sm:pt-2">
              <ChatWindow
                messages={messages}
                title="AgentGPT"
                onSave={
                  shouldShowSave
                    ? () => {
                        setHasSaved(true);
                        agentUtils.saveAgent({
                          goal: goalInput.trim(),
                          name: nameInput.trim(),
                          tasks: messages,
                        });
                      }
                    : undefined
                }
                scrollToBottom
                displaySettings
                openSorryDialog={() => setShowSorryDialog(true)}
                setAgentRun={setAgentRun}
                visibleOnMobile={mobileVisibleWindow === "Chat"}
              >
                <MediaControls
                  status={agentUtils.status}
                  onPlay={() => {
                    handleContinue(AUTOMATIC_MODE);
                  }}
                  onStop={() => {
                    agent?.stopAgent();
                    agentUtils.setStatus("stopped");
                    agentUtils.setRunningMode(AUTOMATIC_MODE);
                  }}
                  onPause={() => {
                    agentUtils.setRunningMode(PAUSE_MODE);
                    if (agent) agent.mode = PAUSE_MODE;
                  }}
                  onStepForward={() => {
                    handleContinue(PAUSE_MODE);
                  }}
                />
              </ChatWindow>
            </Expand>

            <div className="flex w-full flex-col gap-2 md:m-8">
              <Expand delay={1.3}>
                <Input
                  left={
                    <>
                      <FaStar />
                      <span className="ml-2">{`${i18n?.t("LABEL_AGENT_GOAL", {
                        ns: "indexPage",
                      })}`}</span>
                    </>
                  }
                  disabled={agent != null}
                  value={goalInput}
                  onChange={(e) => setGoalInput(e.target.value)}
                  onKeyDown={(e) => handleKeyPress(e)}
                  placeholder={`${i18n?.t("PLACEHOLDER_AGENT_GOAL", {
                    ns: "indexPage",
                  })}`}
                  type="textarea"
                />
              </Expand>
            </div>
          </div>
        </div>
      </main>
    </DefaultLayout>
  );
};

export default Home;

export const getStaticProps: GetStaticProps = async ({ locale = "en" }) => {
  const supportedLocales = languages.map((language) => language.code);
  const chosenLocale = supportedLocales.includes(locale) ? locale : "en";

  return {
    props: {
      ...(await serverSideTranslations(chosenLocale, nextI18NextConfig.ns)),
    },
  };
};
