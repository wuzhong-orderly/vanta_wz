import { useCallback } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  modal,
  useModal,
  Button,
  Box,
  Text,
} from '@orderly.network/ui';
import { markDemoGraduationDialogAsShown } from '@/utils/demoGraduation';

interface DemoGraduationDialogProps {
  onClose?: () => void;
}

const DemoGraduationDialog = modal.create<DemoGraduationDialogProps>((props) => {
  const { visible, hide, onOpenChange } = useModal();

  const handleClose = useCallback(() => {
    markDemoGraduationDialogAsShown();
    hide();
    props.onClose?.();
  }, [hide, props]);

  return (
    <Dialog open={visible} onOpenChange={onOpenChange}>
      <DialogContent className="oui-bg-base-8 oui-border oui-border-line-12">
        <DialogHeader>
          <DialogTitle>Account Graduation Notice</DialogTitle>
        </DialogHeader>
        
        <div className="oui-py-4">
          <Box className="oui-flex oui-flex-col oui-gap-6">
            <Box className="oui-flex oui-flex-col oui-gap-4">
              <Text className="oui-text-sm oui-text-base-contrast-80 oui-leading-relaxed">
                This DEX migrated to a new broker ID, which means all users now have new accounts. 
                Your old demo account is still accessible via the demo platform.
              </Text>
              
              <Text className="oui-text-sm oui-text-base-contrast-80 oui-leading-relaxed">
                To access your demo positions, deposits, and trading history, please visit our demo platform.
              </Text>
            </Box>

            <Box className="oui-flex oui-flex-col oui-gap-3">
              <a
                href="https://dex.orderly.network/demo"
                target="_blank"
                rel="noopener noreferrer"
                className="oui-w-full"
                onClick={handleClose}
              >
                <Button className="oui-w-full" size="lg">
                  Visit Demo Platform
                </Button>
              </a>
            </Box>
            
            <Box className="oui-text-xs oui-text-base-contrast-54 oui-text-center">
              You can always access your demo account at{' '}
              <a 
                href="https://dex.orderly.network/demo" 
                target="_blank" 
                rel="noopener noreferrer"
                className="oui-text-primary-100 hover:oui-text-primary-80 oui-underline"
              >
                dex.orderly.network/demo
              </a>
            </Box>
          </Box>
        </div>
      </DialogContent>
    </Dialog>
  );
});

export const showDemoGraduationDialog = (onClose?: () => void) => {
  modal.show(DemoGraduationDialog, { onClose });
};

export default DemoGraduationDialog;